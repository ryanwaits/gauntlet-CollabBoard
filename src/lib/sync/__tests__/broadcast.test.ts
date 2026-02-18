import { describe, expect, test, mock } from "bun:test";
import {
  broadcastObjectCreate,
  broadcastObjectUpdate,
  broadcastObjectDelete,
  broadcastFrameCreate,
  broadcastFrameDelete,
} from "../broadcast";
import { makeObj, makeFrame } from "../../../../tests/helpers/factory";

describe("broadcast", () => {
  test("broadcastObjectCreate sends correct message", () => {
    const send = mock();
    const obj = makeObj({ id: "o1" });
    broadcastObjectCreate(send, obj);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({ type: "object:create", object: obj });
  });

  test("broadcastObjectUpdate sends correct message", () => {
    const send = mock();
    const obj = makeObj({ id: "o2" });
    broadcastObjectUpdate(send, obj);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({ type: "object:update", object: obj, ephemeral: false });
  });

  test("broadcastObjectUpdate passes ephemeral flag", () => {
    const send = mock();
    const obj = makeObj({ id: "o3" });
    broadcastObjectUpdate(send, obj, true);

    expect(send.mock.calls[0][0].ephemeral).toBe(true);
  });

  test("broadcastObjectDelete sends correct message", () => {
    const send = mock();
    broadcastObjectDelete(send, "del-1");

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({ type: "object:delete", objectId: "del-1" });
  });

  test("broadcastFrameCreate sends correct message", () => {
    const send = mock();
    const frame = makeFrame({ id: "f1" });
    broadcastFrameCreate(send, frame);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({ type: "frame:create", frame });
  });

  test("broadcastFrameDelete sends correct message", () => {
    const send = mock();
    broadcastFrameDelete(send, "f-del");

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({ type: "frame:delete", frameId: "f-del" });
  });
});
