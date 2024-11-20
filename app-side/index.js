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
  /*const latitude = 39.480580;
  const longitude = -0.369214;*/

  const url = `https://www.wiilink24.com/extras/locations.json`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const resBody = await res.json();
    if (res.status === 204) {
      ctx.response({
        data: { result: "No Content" },
      });
      return;
    }

    console.log("Response body:", resBody);

    // Filter the stops close to you and add the distance in meters
    const filteredStops = resBody.stops
      .map(stop => {
        const distance = calculateDistance(latitude, longitude, stop.stop_lat, stop.stop_lon) * 1000; // Convert to meters
        return {
          ...stop,
          distance: Math.trunc(distance) // Truncate the distance to an integer
        };
      })
      .filter(stop => stop.distance <= 1000); // Filter stops within 1000 meters (1 km)
    
    const stopsData = await Promise.all(filteredStops.map(async stop => {
      const additionalDataUrl = `https://metroapi.alexbadi.es/prevision/${stop.stop_id}/parse`;
      const additionalDataRes = await fetch(additionalDataUrl, { method: 'GET' });
      const additionalData = await additionalDataRes.json();
    
      return {
        ...stop,
        additionalData
      };
    }));

    // Sort the stops by distance
    stopsData.sort((a, b) => a.distance - b.distance);
    
    console.log("Combined stops data:", stopsData);
    
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
  const { stopId } = params;
  const url = `https://metroapi.alexbadi.es/prevision/${stopId}/parse`;
  const stopRes = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0'
    }
  });
  
  const stopData = await stopRes.json();
  console.log("Stop data:", stopData);
  const length = stopData.previsiones.length;
  ctx.response({
    data: { result: stopData, length: length },
  });
}

AppSideService({
  onInit() {
    messageBuilder.listen(() => { });

    messageBuilder.on("request", (ctx) => {
      const jsonRpc = messageBuilder.buf2Json(ctx.request.payload);
      if (jsonRpc.method === "GET_METROVALENCIA") {
        return fetchTransportData(ctx, jsonRpc.params);
      } else if (jsonRpc.method === "GET_METROVALENCIA_STOP") {
        return fetchTransportDataStop(ctx, jsonRpc.params);
      }
    });
  },
  onDestroy() { },
});