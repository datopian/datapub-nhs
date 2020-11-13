import React from "react";
import { shallow } from "enzyme";

import SelectSchema from ".";

describe("<SelectSchema />", () => {
  it("render SelectSchema without crashing", () => {
    const onSchemaSelected = jest.fn();
    const resources = [{ name: "sample.csv", id: "sample-id" }];
    const wrapper = shallow(
      <SelectSchema resources={resources} onSchemaSelected={onSchemaSelected} />
    );

    expect(
      wrapper.contains("Copy metadata information from existing resource")
    ).toEqual(true);
    expect(wrapper.contains("sample.csv")).toEqual(true);
    expect(wrapper.find("select")).toHaveLength(1);
    expect(wrapper.find("option")).toHaveLength(2);
  });

  it("Can select schema from the list", () => {
    const onSchemaSelected = jest.fn();
    const resources = [{ name: "sample.csv", id: "sample-id" }];
    const wrapper = shallow(
      <SelectSchema resources={resources} onSchemaSelected={onSchemaSelected} />
    );

    wrapper
      .find("select")
      .simulate("change", { target: { value: "sample-id" } });

    expect(onSchemaSelected.mock.calls.length).toEqual(1);
    // check if passes the resource id
    expect(onSchemaSelected.mock.calls[0][0]).toBe("sample-id");
  });
});
