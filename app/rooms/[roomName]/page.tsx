import * as React from "react";
import { PageClientImpl } from "./PageClientImpl";
import { isVideoCodec } from "@/lib/types";

export default async function Page({ params, searchParams }: any) {
  const { roomName } = await params;
  const { region, hq, codec } = await searchParams;

  return (
    <PageClientImpl
      roomName={roomName}
      region={region}
      hq={hq === "true" ? true : false}
      codec={typeof codec === "string" && isVideoCodec(codec) ? codec : "h264"}
    />
  );
}
