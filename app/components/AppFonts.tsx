"use client";

import { preinit } from "react-dom";

export function AppFonts() {
  preinit(
    "https://fonts.googleapis.com/css2?family=Google+Sans+Code&family=Google+Sans+Flex:opsz,wght,ROND@6..144,1..1000,100&family=Google+Sans:opsz,wght@17..18,400..700&display=swap",
    { as: "style" },
  );
  preinit(
    "https://fonts.googleapis.com/css2?family=Google+Symbols:opsz,wght,FILL,GRAD,ROND@20..48,100..700,0..1,-50..200,0..100&display=swap&icon_names=arrow_drop_down,check_circle,close,communication,content_copy,delete,draw,error,info,mobile_layout,pen_size_1,progress_activity,rectangle,send,upload,warning",
    { as: "style" },
  );

  return null;
}
