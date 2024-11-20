import { createWidget, widget, align, text_style, redraw, deleteWidget } from "@zos/ui";
import { log as Logger, px } from "@zos/utils";
import { Geolocation } from "@zos/sensor";
import { push } from '@zos/router';
import { updateStatusBarTitle } from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from "../utils/config/device";

const geolocation = new Geolocation();

const logger = Logger.getLogger("fetch_api");
const { messageBuilder } = getApp()._options.globalData;
const PILL_HEIGHT = 190;
const REFRESH = 30000;

Page({
  state: {},
  onInit() {
    updateStatusBarTitle("metrovalencia | Closest Stops");
  },
  build() {
    // Call getStops on page load
    loading = createWidget(widget.TEXT, {
      x: px(0),
      y: px(0),
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      text: "Loading...",
      text_size: px(36),
      color: 0xcccccc,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
    });

    setInterval(() => {
      redraw();
      this.getStops();
    }, REFRESH);
  },

  getStops() {
    geolocation.start();
    const latitude = geolocation.getLatitude();
    const longitude = geolocation.getLongitude() * -1;

    messageBuilder
      .request({
        method: "GET_METROVALENCIA",
        params: {
          latitude,
          longitude,
        },
      })
      .then((data) => {


        const viewContainer = createWidget(widget.VIEW_CONTAINER, {
          x: px(0),
          y: px(100),
          w: DEVICE_WIDTH,
          h: DEVICE_HEIGHT - px(100),
        });

        let totalIndex = 0;

        if (data.result === "No Content") {
          viewContainer.createWidget(widget.FILL_RECT, {
            x: px(0),
            y: px(20),
            w: DEVICE_WIDTH,
            h: px(300),
            radius: px(30),
            color: 0x1a1a1a,
          });
          viewContainer.createWidget(widget.TEXT, {
            x: px(0),
            y: px(60),
            w: DEVICE_WIDTH,
            h: px(200),
            text: "!",
            text_size: px(80),
            color: 0xcccccc,
            align_h: align.CENTER_H,
          });
          viewContainer.createWidget(widget.TEXT, {
            x: px(0),
            y: px(200),
            w: DEVICE_WIDTH,
            h: px(70),
            text: "No stops found nearby",
            text_size: px(36),
            color: 0xcccccc,
            align_h: align.CENTER_H,
          });
          totalIndex += 1.7;
          deleteWidget(loading);
        }

        if (data.result === "ERROR") {
          viewContainer.createWidget(widget.FILL_RECT, {
            x: px(0),
            y: px(20),
            w: DEVICE_WIDTH,
            h: px(300),
            radius: px(30),
            color: 0x1a1a1a,
          });
          viewContainer.createWidget(widget.TEXT, {
            x: px(0),
            y: px(60),
            w: DEVICE_WIDTH,
            h: px(200),
            text: "!",
            text_size: px(80),
            color: 0xcccccc,
            align_h: align.CENTER_H,
          });
          viewContainer.createWidget(widget.TEXT, {
            x: px(0),
            y: px(200),
            w: DEVICE_WIDTH,
            h: px(70),
            text: "Phone disconnected",
            text_size: px(36),
            color: 0xcccccc,
            align_h: align.CENTER_H,
          });
          totalIndex += 1.7;
          deleteWidget(loading);
        }

        const MESSAGE_HEIGHT = 0;

        viewContainer.createWidget(widget.TEXT, {
          x: px(30),
          y: px(0),
          w: DEVICE_WIDTH - px(60),
          h: px(MESSAGE_HEIGHT),
          text_size: px(36),
          color: 0xcccccc,
          align_h: align.LEFT,
          align_v: align.TOP,
          text: "Closest stops",
        });

        logger.log("Data:", data.result);

        Array.from({ length: data.length }).forEach((_, index) => {
          const station = data.result[index];
          
          viewContainer.createWidget(widget.BUTTON, {
            x: 0,
            y: px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: DEVICE_WIDTH,
            h: px(PILL_HEIGHT),
            normal_color: 0x181818,
            press_color: 0x1a1a1a,
            radius: px(30),
            click_func: () => {
              push({
                url: '/pages/stop',
                params: {
                  stopId: station.stop_id,
                  stopLatitude: station.stop_lat,
                  stopLongitude: station.stop_lon,
                  stopName: station.stop_name,
                  stopUbica: station.street_name,
                  stopRoutes: station.lines,
                  distance: station.distance,
                }
              });
            }
          });

          logger.log(station.additionalData.previsiones.length);
          if (station.additionalData.previsiones.length > 0) {
            viewContainer.createWidget(widget.TEXT, {
              x: px(30),
              y: px(20) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
              w: DEVICE_WIDTH - px(100),
              h: px(46),
              text_size: px(28),
              color: (() => {
                logger.log(station.additionalData.previsiones[0].hora);
                const arrivalTime = station.additionalData.previsiones[0].hora;
                const [arrivalHours, arrivalMinutes] = arrivalTime.split(':').map(Number);
                const now = new Date();
                const nowMinutes = (now.getHours()) * 60 + now.getMinutes();
                const arrivalTotalMinutes = (arrivalHours + 1) * 60 + arrivalMinutes;
                const minutesUntilArrival = arrivalTotalMinutes - nowMinutes;

                return (minutesUntilArrival <= 5) ? 0x66ff66 : 0xcccccc; // Green if minutes <= 5 or text is "Now", otherwise light gray
              })(),
              align_h: align.RIGHT,
              align_v: align.TOP,
              text: (() => {
                const arrivalTime = station.additionalData.previsiones[0].hora;
                const [arrivalHours, arrivalMinutes] = arrivalTime.split(':').map(Number);
                logger.log(arrivalHours, arrivalMinutes);
                const now = new Date();
                const nowMinutes = (now.getHours()) * 60 + now.getMinutes();
                logger.log(now.getHours(), now.getMinutes());
                const arrivalTotalMinutes = (arrivalHours + 1) * 60 + arrivalMinutes;
                const minutesUntilArrival = arrivalTotalMinutes - nowMinutes;

                return minutesUntilArrival >= 0 ? `${minutesUntilArrival} min` : 'N/A'; // Show minutes until arrival, otherwise 'N/A'
              })(),
            });

            viewContainer.createWidget(widget.FILL_RECT, {
              x: DEVICE_WIDTH - px(60),
              y: px(30) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
              w: px(30),
              h: px(30),
              color: 0x4a4a4a,
              radius: px(8),
            });

            viewContainer.createWidget(widget.TEXT, {
              x: DEVICE_WIDTH - px(60),
              y: px(32) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
              w: px(30),
              h: px(30),
              text_size: px(18),
              color: 0xffffff,
              align_h: align.CENTER_H,
              align_v: align.TOP,
              text: station.additionalData.previsiones[0].line,
            });
          } else {
            viewContainer.createWidget(widget.TEXT, {
              x: px(30),
              y: px(20) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
              w: DEVICE_WIDTH - px(60),
              h: px(46),
              text_size: px(28),
              color: 0xcccccc, // Light gray color
              align_h: align.RIGHT,
              align_v: align.TOP,
              text: "No service",
            });
          }

          Array.from({
            length: Array.isArray(station.lines) ? station.lines.length : 1,
          }).forEach((_, index2) => {
            viewContainer.createWidget(widget.IMG, {
              x: px(30) + px(index2 * 50),
              y: px(20) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
              src: `/line_images/${station.lines[index2]}.png`,
            });
          });

          viewContainer.createWidget(widget.TEXT, {
            x: px(30),
            y: px(70) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: DEVICE_WIDTH - px(60),
            h: px(46),
            text_size: px(36),
            color: 0xffffff,
            align_h: align.LEFT,
            align_v: align.TOP,
            text: `${station.stop_id} - ${station.stop_name}`,
          });

          viewContainer.createWidget(widget.TEXT, {
            x: px(30),
            y: px(120) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: DEVICE_WIDTH - px(60),
            h: px(46),
            text_size: px(28),
            color: 0xcccccc,
            align_h: align.LEFT,
            align_v: align.BOTTOM,
            text_style: text_style.ELLIPSIS,
            text: `${station.street_name}`,
          });

          totalIndex += 1;
        });

        viewContainer.createWidget(widget.BUTTON, {
          x: px(0),
          y: px(20) + px(totalIndex * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
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
              y: px(0),
              w: DEVICE_WIDTH,
              h: DEVICE_HEIGHT,
              text: "Loading...",
              text_size: px(36),
              color: 0xcccccc,
              align_h: align.CENTER_H,
              align_v: align.CENTER_V,
            });
            deleteWidget(viewContainer);
            this.getStops();
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
