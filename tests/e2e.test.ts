import Verto from "../src";
import { assert } from "chai";

let vertoInstance: Verto;

describe("E2E Tests", () => {
  it("Create Verto instance", (done) => {
    vertoInstance = new Verto();
    assert(vertoInstance);
    done();
  });
});
