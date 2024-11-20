import { createWidget, widget, align, text_style, redraw, deleteWidget } from "@zos/ui";
import { log as Logger, px } from "@zos/utils";
import { DEVICE_WIDTH, DEVICE_HEIGHT } from "../utils/config/device";

const logger = Logger.getLogger("fetch_api");
let data = null;

Page({
    state: {},
    onInit(params) {
    logger.log("params", params);
      data = JSON.parse(params);
      logger.log(data);
    },
    build() {
      createWidget(widget.QRCODE, {
        content: `https://www.google.com/maps?q=${data.latitude},${data.longitude}`,
      x: DEVICE_WIDTH / 2 - 100,
      y: DEVICE_HEIGHT / 2 - 100,
      w: 200,
      h: 200,
      bg_x: DEVICE_WIDTH / 2 - 120,
      bg_y: DEVICE_HEIGHT / 2 - 120,
      bg_w: 240,
      bg_h: 240,
      bg_radius: 20,
    });
    },
  });
  