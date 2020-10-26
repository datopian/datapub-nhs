import React from "react";

import { action } from "@storybook/addon-actions";

import SelectSchema from "../components/SelectSchema";

export default {
  title: "Components /SelectSchema",
  component: SelectSchema,
  argTypes: {
    resources: {
      control: {
        type: "select",
        options: [],
      },
    },
    onSchemaSelected: { action: "clicked" },
  },
};

const Template = (args) => <SelectSchema {...args} />;

export const SelectSchemaStory = Template.bind({});

SelectSchemaStory.args = {
  resources: [
    { name: "sample1.csv", id: "sample-id1", schema: "{}" },
    { name: "sample2.csv", id: "sample-id2" },
  ],
  onSchemaSelected: action("sample.csv"),
};
