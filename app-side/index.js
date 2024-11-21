import { MessageBuilder } from "../shared/message-side";
import { parseBusEstimations, addClosestBusInfo } from "../utils/busTimeParser";

const messageBuilder = new MessageBuilder();

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

async function fetchTransportData(ctx, params) {
  const { latitude, longitude } = params;
  const lowerCornerLon = longitude - 0.001;
  const lowerCornerLat = latitude - 0.001;
  const upperCornerLon = longitude + 0.001;
  const upperCornerLat = latitude + 0.001;
  
  const url = `https://geoportal.emtvalencia.es/opentripplanner-api-webapp/ws/metadata/stopsInExtent?lowerCornerLon=${lowerCornerLon}&lowerCornerLat=${lowerCornerLat}&upperCornerLon=${upperCornerLon}&upperCornerLat=${upperCornerLat}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const resBody = await res.json();
    if (res.status === 204) {
      ctx.response({
        data: { result: "No Content" },
      });
      return;
    }

    const stopsData = await Promise.all(resBody.stop.map(async stop => {
      const routes = Array.isArray(stop.routes.rtI) ? await (async () => {
        const route = stop.routes.rtI[0]; // Take the first element
        const timeUrl = `https://geoportal.emtvalencia.es/EMT/mapfunctions/MapUtilsPetitions.php?sec=getSAE&parada=${stop.stopId}&adaptados=false&idioma=en&nocache=0.2266934924450733`;
        const timeRes = await fetch(timeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0'
          }
        });
    
        // It returns an xml response, parse it to json
        let timeText = await timeRes.text();
        const buses = parseBusEstimations(timeText);
        const closestBus = addClosestBusInfo(buses);
        return closestBus;
      })() : await (async () => {
        const timeUrl = `https://geoportal.emtvalencia.es/EMT/mapfunctions/MapUtilsPetitions.php?sec=getSAE&parada=${stop.stopId}&adaptados=false&idioma=en&nocache=0.2266934924450733`;
        const timeRes = await fetch(timeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0'
          }
        });
    
        // It returns an xml response, parse it to json
        let timeText = await timeRes.text();
        const buses = parseBusEstimations(timeText);
        const closestBus = addClosestBusInfo(buses);
        return closestBus;
      })();
    
      const closestBus = routes.closestBus;
    
      // Calculate the distance from the user to the stop
      const distance = calculateDistance(latitude, longitude, stop.lat, stop.lon);
    
      return {
        stopId: stop.stopId,
        name: stop.name,
        ubica: stop.ubica,
        routes: stop.routes,
        lat: stop.lat,
        lon: stop.lon,
        closestBus: closestBus,
        distance: distance
      };
    }));

    // Sort the stops by distance
    stopsData.sort((a, b) => a.distance - b.distance);
    
    let length = stopsData.length;
    ctx.response({
      data: { result: stopsData, length: length },
    });

  } catch (error) {
    console.error("Error fetching transport data:", error);
    ctx.response({
      data: { result: "ERROR" },
    });
  }
}

async function fetchTransportDataStop(ctx, params) {
  const { latitude, longitude, stopId } = params;
  const url = `https://geoportal.emtvalencia.es/EMT/mapfunctions/MapUtilsPetitions.php?sec=getSAE&parada=${stopId}&adaptados=false&idioma=en&nocache=0.2266934924450733`;
  const stopRes = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0'
    }
  });
  
  // It returns an xml response, parse it to json
  let stopText = await stopRes.text();
  const buses = parseBusEstimations(stopText);

  // Add in response data and length objects in one
  let length = buses.buses.length;
  ctx.response({
    data: { result: buses, length: length },
  });
}

AppSideService({
  onInit() {
    messageBuilder.listen(() => { });

    messageBuilder.on("request", (ctx) => {
      const jsonRpc = messageBuilder.buf2Json(ctx.request.payload);
      if (jsonRpc.method === "GET_EMT") {
        return fetchTransportData(ctx, jsonRpc.params);
      } else if (jsonRpc.method === "GET_EMT_STOP") {
        return fetchTransportDataStop(ctx, jsonRpc.params);
      }
    });
  },
  onDestroy() { },
});