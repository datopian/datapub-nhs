import React, { useState } from "react";

import PropTypes from "prop-types";

const SelectSchema = ({ resources, client, onSchemaSelected }) => {
  const [selectedSchema, setSelectedSchema] = useState("");

  const onChangeHandlder = async (event) => {
    const resourceId = event.target.value;
    setSelectedSchema(event.target.value);
    onSchemaSelected(resourceId);
  };
  return (
    <div className="app-form-field">
      <label className="metadata-label">
        Copy metadata information from existing resource
      </label>
      <select
        className="app-form-field-input"
        value={selectedSchema}
        onChange={onChangeHandlder}
      >
        <option value="">Select...</option>
        {resources.map(({ name, schema, id }, index) => {
          return (
            <option
              key={`select-schema-option-${id}-${index}`}
              value={id}
              disabled={!schema}
            >
              {name} {!schema ? "(no schema to copy)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
};

SelectSchema.propTypes = {
  resources: PropTypes.array.isRequired,
  onSchemaSelected: PropTypes.func.isRequired,
};

export default SelectSchema;
