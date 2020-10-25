import { removeHyphen } from "./index";

describe("Utils", () => {
  it("remove hyphen from uuid", () => {
    expect(removeHyphen("fd77e419-32ae-4025-8d14-890343b605a3")).toEqual(
      "fd77e41932ae40258d14890343b605a3"
    );
    expect(removeHyphen("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")).toEqual(
      "9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d"
    );
    expect(removeHyphen("should not broken without hyphen")).toEqual(
      "should not broken without hyphen"
    );
  });
});
