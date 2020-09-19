import Verto from "../src";
import { assert } from "chai";

// Assign a token; Just for testing
const TOKEN = "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A";

let vertoInstance: Verto;

describe("E2E Tests", () => {
  it("Create Verto instance", (done) => {
    vertoInstance = new Verto();
    assert(vertoInstance);
    done();
  });
  it("Test getTokens(<CONTRACT>)", (done) => {
    vertoInstance
      .getTokens(TOKEN)
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Test getTradingPosts()", (done) => {
    vertoInstance
      .getTradingPosts()
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Test price(<TOKEN>)", (done) => {
    vertoInstance
      .price(TOKEN)
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Test volume(<TOKEN>)", (done) => {
    vertoInstance
      .volume(TOKEN)
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
});
