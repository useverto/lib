import Verto from "../src";
import { assert } from "chai";

// Assign a token/address/trading post; Just for testing
const TOKEN = "usjm4PCxUd5mtaon7zc97-dt-3qf67yPyqgzLnLqk5A";
const ADDR = "aLemOhg9OGovn-0o4cOCbueiHT9VgdYnpJpq7NgMA1A";
const POST = "WNeEQzI24ZKWslZkQT573JZ8bhatwDVx6XVDrrGbUyk";

let vertoInstance: Verto;

describe("E2E Tests", () => {
  it("Create Verto instance", (done) => {
    vertoInstance = new Verto();
    assert(vertoInstance);
    done();
  });
  it("Test getAssets(<ADDR>)", (done) => {
    vertoInstance
      .getAssets(ADDR)
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Test getConfig(<POST>)", (done) => {
    vertoInstance
      .getConfig(POST)
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Test getExchanges(<ADDR>)", (done) => {
    vertoInstance
      .getExchanges(ADDR)
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Test getReputation(<POST>)", (done) => {
    vertoInstance
      .getReputation(POST)
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
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
  it("Test getTPTokens(<POST>)", (done) => {
    vertoInstance
      .getTPTokens(POST)
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
  it("Test getTransactions(<ADDR>)", (done) => {
    vertoInstance
      .getTransactions(ADDR)
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
