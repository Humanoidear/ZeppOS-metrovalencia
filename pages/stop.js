import { createWidget, widget, align, text_style, redraw, deleteWidget } from "@zos/ui";
import { log as Logger, px } from "@zos/utils";
import { Geolocation } from "@zos/sensor";
import { push } from '@zos/router';
import { updateStatusBarTitle } from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from "../utils/config/device";

const geolocation = new Geolocation();

const logger = Logger.getLogger("fetch_api");
const { messageBuilder } = getApp()._options.globalData;
const PILL_HEIGHT = 90;
const REFRESH = 30000;
let data = null;
let distance = 0;
let data2 = null;

Page({
  state: {},
  onInit(params) {
    // convert the param to json from text
    data = JSON.parse(params);
    data2 = JSON.parse(params);
    logger.info("Received stop data", data.stopRoutes);
    updateStatusBarTitle("metrovalencia | " + data.stopId + " - " + data.stopName);

    // Convert the location of the watch and the stop to km
    function distanceGPStoLocation(lat1, lon1, lat2, lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2 - lat1);  // deg2rad below
      var dLon = deg2rad(lon2 - lon1);
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var d = R * c; // Distance in km
      return d * 1000;
    }

    function deg2rad(deg) {
      return deg * (Math.PI / 180)
    }

    geolocation.start();
    const paramData = JSON.parse(params);
    distance = distanceGPStoLocation(geolocation.getLatitude(), geolocation.getLongitude(), paramData.stopLatitude, paramData.stopLongitude);
  },
  build() {
    const viewContainer2 = createWidget(widget.GROUP, {
      x: px(0),
      y: px(100),
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT - px(100),
    });

    viewContainer2.createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: px(190),
      color: 0x181818,
      radius: px(30)
    });

    viewContainer2.createWidget(widget.TEXT, {
      x: 0,
      y: px(20),
      w: DEVICE_WIDTH - px(30),
      h: px(46),
      text_size: px(28),
      color: 0xcccccc,
      align_h: align.RIGHT,
      align_v: align.TOP,
      text: distance.toFixed(0) + " m",
    });

    Array.from({
      length: Array.isArray(data.stopRoutes) ? data.stopRoutes.length : 1,
    }).forEach((_, index) => {
      viewContainer2.createWidget(widget.IMG, {
        x: px(30) + px(index * 50),
        y: px(20),
        src: `/line_images/${data.stopRoutes[index]}.png`,
      });
    });

    viewContainer2.createWidget(widget.TEXT, {
      x: px(30),
      y: px(70),
      w: DEVICE_WIDTH - px(60),
      h: px(46),
      text_size: px(36),
      color: 0xffffff,
      align_h: align.LEFT,
      align_v: align.TOP,
      text: `${data.stopId} - ${data.stopName}`,
    });

    viewContainer2.createWidget(widget.TEXT, {
      x: px(30),
      y: px(120),
      w: DEVICE_WIDTH - px(60),
      h: px(46),
      text_size: px(28),
      color: 0xcccccc,
      align_h: align.LEFT,
      align_v: align.BOTTOM,
      text_style: text_style.ELLIPSIS,
      text: `${data.stopUbica}`,
    });

    loading = createWidget(widget.TEXT, {
      x: px(0),
      y: px(280),
      w: DEVICE_WIDTH,
      h: px(100),
      text: "Loading stop " + data.stopId + "...",
      text_size: px(36),
      color: 0x222222,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
    });

    setInterval(() => {
      redraw();
      this.getStopData();
    }, REFRESH);
  },
  getStopData() {
    geolocation.start();
    const latitude = geolocation.getLatitude();
    const longitude = geolocation.getLongitude() * -1;
    const stopId = data.stopId;

    messageBuilder
      .request({
        method: "GET_METROVALENCIA_STOP",
        params: {
          latitude,
          longitude,
          stopId,
        },
      })
      .then((data) => {
        const viewContainer = createWidget(widget.VIEW_CONTAINER, {
          x: px(0),
          y: px(300),
          w: DEVICE_WIDTH,
          h: DEVICE_HEIGHT - px(300),
        });

        let totalIndex = 0;
        logger.log("Received transport data", data.result.previsiones);
        if (data.length > 0) {
          data.result.previsiones.forEach((train, index) => {
            logger.log("Train data", train);
            if (train.line_id !== null) {
              viewContainer.createWidget(widget.IMG, {
                x: px(30),
                y: px(20) + px(index * (PILL_HEIGHT + 10)),
                src: `/line_images/${train.line_id}.png`,
              });

              logger.log("Train data", train);

              viewContainer.createWidget(widget.TEXT, {
                x: px(100),
                y: px(0) + px(index * (PILL_HEIGHT + 10)),
                w: DEVICE_WIDTH - px(130),
                h: px(46),
                text_size: px(36),
                color: 0xffffff,
                align_h: align.LEFT,
                align_v: align.CENTER_V,
                text: `${train.destino}`,
              });

              viewContainer.createWidget(widget.TEXT, {
                x: px(100),
                y: px(35) + px(index * (PILL_HEIGHT + 10)),
                w: DEVICE_WIDTH - px(130),
                h: px(46),
                text_size: px(28),
                color: 0xcccccc,
                align_h: align.LEFT,
                align_v: align.CENTER_V,
                text: `a ${train.meters} metros`,
              });

              let fixedHora = null;
              viewContainer.createWidget(widget.TEXT, {
                x: 0,
                y: px(20) + px(index * (PILL_HEIGHT + 10)),
                w: DEVICE_WIDTH - px(20),
                h: px(46),
                text_size: px(28),
                color: (() => {
                  const arrivalTime = train.hora;
                  const [arrivalHours, arrivalMinutes] = arrivalTime.split(':').map(Number);
                  const now = new Date();
                  const nowMinutes = (now.getHours()/2) * 60 + now.getMinutes();
                  logger.log(now.getHours(), now.getMinutes());
                  const arrivalTotalMinutes = arrivalHours * 60 + arrivalMinutes;
                  const minutesUntilArrival = arrivalTotalMinutes - nowMinutes;
                  logger.log("Minutes until arrival", minutesUntilArrival);
                  fixedHora = (arrivalHours + 1) + ":" + arrivalMinutes;
                  return (minutesUntilArrival <= 5) ? 0x66ff66 : 0xcccccc; // Green if minutes <= 5, otherwise light gray
                })(),
                align_h: align.RIGHT,
                align_v: align.TOP,
                text: fixedHora || 'N/A', // Use minutos, if not present use horaLlegada, otherwise 'N/A'
              });

              totalIndex += 1;
            }
          });
        } else {
          viewContainer.createWidget(widget.TEXT, {
            x: 0,
            y: (DEVICE_HEIGHT - px(46)) / 2, // Center vertically
            w: DEVICE_WIDTH,
            h: px(46),
            text_size: px(36),
            color: 0xcccccc, // Light gray color
            align_h: align.CENTER_H,
            align_v: align.CENTER_V,
            text: "No service",
          });
        }

        viewContainer.createWidget(widget.BUTTON, {
          x: px(0),
          y: px(20) + px(totalIndex * (PILL_HEIGHT + 10)),
          w: DEVICE_WIDTH,
          h: px(60),
          text: "View on map",
          normal_color: 0x000000,
          press_color: 0x1a1a1a,
          radius: px(10),
          text_size: px(36),
          color: 0x262626,
          click_func: () => {
            push({
              url: 'pages/qr',
              params: {
                latitude: data2.stopLatitude,
                longitude: data2.stopLongitude
              },
            });
          },
        });

        totalIndex += 1;

        viewContainer.createWidget(widget.BUTTON, {
          x: px(0),
          y: px(20) + px(totalIndex * (PILL_HEIGHT + 10)),
          w: DEVICE_WIDTH,
          h: px(60),
          text: "Refresh",
          normal_color: 0x000000,
          press_color: 0x1a1a1a,
          radius: px(10),
          text_size: px(36),
          color: 0x262626,
          click_func: () => {
            loading = createWidget(widget.TEXT, {
              x: px(0),
              y: px(280),
              w: DEVICE_WIDTH,
              h: DEVICE_HEIGHT,
              text: "Loading...",
              text_size: px(36),
              color: 0x1a1a1a,
              align_h: align.CENTER_H,
              align_v: align.CENTER_V,
            });
            deleteWidget(viewContainer);
            this.getStopData();
          },
        });
        deleteWidget(loading);

        setTimeout(() => {
          deleteWidget(viewContainer);
        }, REFRESH);
      })
      .catch((error) => {
        logger.error("Error receiving transport data", error);
      });
  },
});
