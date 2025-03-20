import React from "react";
import { Client } from "ckanClient";
import PropTypes from "prop-types";
import frictionlessCkanMapper from "frictionless-ckan-mapper-js";
import { v4 as uuidv4 } from "uuid";
import { TableSchema } from "datapub";
import Upload from "./components/Upload";
import SelectSchema from "./components/SelectSchema";
import Metadata from "./components/Metadata";
import Spinner from "./components/Spinner";

import "./App.css";
import { removeHyphen } from "./utils";

export class ResourceEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      resources: [],
      datasetId: this.props.config.datasetId,
      resourceId: "",
      resource: this.props.resource || {},
      ui: {
        fileOrLink: "",
        uploadComplete: undefined,
        success: false,
        error: false,
        loading: false,
      },
      client: null,
      isResourceEdit: false,
      createUpdateLoading: false,
      deleteLoading: false,
    };
    this.metadataHandler = this.metadataHandler.bind(this);
  }

  async componentDidMount() {
    const { config } = this.props;
    const {
      authToken,
      api,
      lfs,
      organizationId,
      datasetId,
      resourceId,
    } = config;

    const client = new Client(
      `${authToken}`,
      `${organizationId}`,
      `${datasetId}`,
      `${api}`,
      `${lfs}`
    );


    // get dataset
    const { result } = await client.action("package_show", {
      id: datasetId,
    });

    const resources = result.resources || [];

    this.setState({ client, resources });
    

    //Check if the user is editing resource
    if (resourceId) {
      this.setResource(resourceId);
    }
  }

  metadataHandler(fileResource) {
    let resource = this.extendResource(fileResource);
    this.setState({
      resource,
    });
  }

  /**
   * Adds a new field bq_table_name to resources and formats name property
   * @param {Object} resource
   */
  extendResource(resource) {
    let newResource = { ...resource };
    newResource.title = resource.name;
    newResource.urlName = resource.name;
    newResource.size = resource.size;

    const newName = resource.name.split(".")[0].toUpperCase();
    newResource.name = newName;
    newResource.bq_table_name = newName;
    return newResource;
  }

  handleChangeMetadata = (event) => {
    const target = event.target;
    const value = target.value;
    const name = target.name;
    let resourceCopy = this.state.resource;
    resourceCopy[name] = value;

    this.setState({
      resource: resourceCopy,
    });
  };

  handleSubmitMetadata = async () => {
    const { resource, client } = this.state;
    await this.createResource(resource);

    // Change state of dataset to active if draft atm
    // this relates to how CKAN v2 has a phased dataset creation. See e.g.
    // https://github.com/ckan/ckan/blob/master/ckan/controllers/package.py#L917

    // only need to do this test if in resource create mode if editing a
    // resource this is unnecessary
    // TODO: update this in future to check for edit mode
    const isResourceCreate = true;
    if (isResourceCreate) {
      const datasetMetadata = await client.action("package_show", {
        id: this.state.datasetId,
      });
      let result = datasetMetadata.result;

      if (result.state === "draft") {
        result.state = "active";
        await client.action("package_update", result);
      }
    }

    // Redirect to dataset page
    return (window.location.href = `/dataset/${this.state.datasetId}`);
  };

  createResource = async (resource) => {
    const { client } = this.state;
    const { config } = this.props;
    this.setState({ createUpdateLoading: true });
    const { organizationId, datasetId, resourceId } = config;
    const { urlName } = resource;
    delete resource.urlName;

    const resourceCopy = JSON.parse(JSON.stringify(resource));

    if (resourceCopy.schema && resourceCopy.schema.fields) {
      resourceCopy.schema.fields = resourceCopy.schema.fields.map(field => ({
        ...field,
        title: field.title || '',
        description: field.description || '',
        type: field.type || 'string',
        format: field.format || 'default'
      }));
    }

    const ckanResource = frictionlessCkanMapper.resourceFrictionlessToCkan(
      resourceCopy
    );

    // Remove the sample key from the resource object before sending it to the API
    let data = { ...ckanResource.sample };
    delete ckanResource.sample;
    let bqTableName = ckanResource.bq_table_name
      ? ckanResource.bq_table_name
      : uuidv4();
      
    let ckanResourceCopy = {
      ...ckanResource,
      package_id: this.state.datasetId,
      name: resourceCopy.name || resourceCopy.title,
      lfs_prefix: `${organizationId}/${datasetId}`,
      url: urlName,
      url_type: "upload",
      bq_table_name: removeHyphen(bqTableName),
      sample: data,
    };

    if (resourceId) {
      ckanResourceCopy = {
        ...ckanResourceCopy,
        id: resourceId,
      };
      if(!urlName) {
        ckanResourceCopy.url = `${resourceCopy?.name?.toLowerCase()}.${resourceCopy?.format?.toLowerCase()}`
      }
      await client.action("resource_update", ckanResourceCopy);

      return (window.location.href = `/dataset/${datasetId}`);
    }
    await client
      .action("resource_create", ckanResourceCopy)
      .then((response) => {
        this.onChangeResourceId(response.result.id);
      });
  };

  deleteResource = async () => {
    const { resource, client, datasetId } = this.state;
    this.setState({ deleteLoading: true });
    if (window.confirm("Are you sure to delete this resource?")) {
      await client.action("resource_delete", { id: resource.id });

      return (window.location.href = `/dataset/${datasetId}`);
    }
  };

  setLoading = (isLoading) => {
    this.setState({
      ui: { ...this.state.ui, loading: isLoading },
    });
  };

  handleUploadStatus = (status) => {
    const { ui } = this.state;
    const newUiState = {
      ...ui,
      success: status.success,
      error: status.error,
      loading: status.loading,
    };

    this.setState({ ui: newUiState });
  };

  onChangeResourceId = (resourceId) => {
    this.setState({ resourceId });
  };

  onSchemaSelected = async (resourceId) => {
    this.setLoading(true);
    const { sample, schema } = await this.getSchemaWithSample(resourceId);
    this.setLoading(false);

    // If the current resource already has a schema with fields, we need to merge them properly
    // to preserve any manually added fields
    let newResource = {...this.state.resource};

    if (newResource.schema && newResource.schema.fields && schema.fields) {
      // Create a map of existing fields by name for easy lookup
      const existingFieldsMap = {};
      newResource.schema.fields.forEach(field => {
        existingFieldsMap[field.name] = field;
      });

      // Create a new fields array that preserves both template fields and any new fields
      const mergedFields = schema.fields.map(templateField => {
        // If this field exists in both schemas, preserve any manually entered data
        if (existingFieldsMap[templateField.name]) {
          return {
            ...templateField,
            title: existingFieldsMap[templateField.name].title || templateField.title,
            description: existingFieldsMap[templateField.name].description || templateField.description,
            type: existingFieldsMap[templateField.name].type || templateField.type,
            format: existingFieldsMap[templateField.name].format || templateField.format
          };
        }
        return templateField;
      });

      // Add any new fields that weren't in the template
      newResource.schema.fields.forEach(field => {
        const fieldExists = schema.fields.some(templateField => templateField.name === field.name);
        if (!fieldExists) {
          mergedFields.push(field);
        }
      });

      // Update the schema with merged fields
      newResource.schema = {
        ...schema,
        fields: mergedFields
      };
      newResource.sample = sample;
    } else {
      // If there's no existing schema, just use the template schema
      newResource = Object.assign(newResource, { schema, sample });
    }

    this.setState({ resource: newResource });
  };

  getSchemaWithSample = async (resourceId) => {
    const { client } = this.state;

    const resourceSchema = await client.action("resource_schema_show", {
      id: resourceId,
    });
    const resourceSample = await client.action("resource_sample_show", {
      id: resourceId,
    });

    const sample = [];

    const schema = resourceSchema.result || { fields: [] };

    try {
      // push the values to an array
      for (const property in resourceSample.result) {
        sample.push(resourceSample.result[property]);
      }
    } catch (e) {
      console.error(e);
      //generate empty values not to break the tableschema component
    }

    return { schema, sample };
  };

  setResource = async (resourceId) => {
    const { client } = this.state;

    const { result } = await client.action("resource_show", { id: resourceId });

    let resourceCopy = {
      ...result,
      ...(await this.getSchemaWithSample(resourceId)),
    };

    return this.setState({
      client,
      resourceId,
      resource: resourceCopy,
      isResourceEdit: true,
    });
  };

  render() {
    const { success, loading } = this.state.ui;
    const { createUpdateLoading, deleteLoading } = this.state;

    const LoadingButton = ({ isLoading, children, ...props }) => (
      <button {...props}>
        <div className="spinner-button">
          {isLoading ? <Spinner size={18}/> : null}
          {children}
        </div>
      </button>
    );

    return (
      <div className="App">
        <form
          className="upload-wrapper"
          onSubmit={(event) => {
            event.preventDefault();
            if (this.state.isResourceEdit) {
              return this.createResource(this.state.resource);
            }
            return this.handleSubmitMetadata();
          }}
        >
          <div className="upload-header">
            <h2 className="upload-header__title">Resource Editor</h2>
          </div>

          <Upload
            client={this.state.client}
            resource={this.state.resource}
            metadataHandler={this.metadataHandler}
            datasetId={this.state.datasetId}
            handleUploadStatus={this.handleUploadStatus}
            onChangeResourceId={this.onChangeResourceId}
          />

          <div className="upload-edit-area">
            <Metadata
              metadata={this.state.resource}
              handleChange={this.handleChangeMetadata}
            />
            <div className="app-form-grid app-divider">
              <SelectSchema
                resources={this.state.resources}
                onSchemaSelected={this.onSchemaSelected}
              />
            </div>
            {this.state.resource.schema && Object.keys(this.state.resource.schema).length > 0 && (
              <TableSchema
                schema={this.state.resource.schema}
                data={this.state.resource.sample || []}
              />
            )}
            {!this.state.isResourceEdit ? (
             <LoadingButton disabled={!success || createUpdateLoading} 
                isLoading={createUpdateLoading} 
                className="btn">
                Save and Publish
              </LoadingButton>
            ) : (
              <div className="resource-edit-actions">
                <LoadingButton 
                  disabled={deleteLoading} 
                  type="button"
                  className="btn btn-delete"
                  onClick={this.deleteResource}
                  isLoading={deleteLoading}
                >
                  Delete
                </LoadingButton>
                <LoadingButton 
                disabled={createUpdateLoading} 
                isLoading={createUpdateLoading}
                className="btn">
                  Update
                </LoadingButton>
              </div>
            )}
          </div>
        </form>
      </div>
    );
  }
}

/**
 * If the parent component doesn't specify a `config` and scope prop, then
 * the default values will be used.
 * */
ResourceEditor.defaultProps = {
  config: {
    authToken: "be270cae-1c77-4853-b8c1-30b6cf5e9878",
    api: "http://localhost:5000",
    lfs: "http://localhost:5001", // Feel free to modify this
    organizationId: "myorg",
    datasetId: "data-test-2",
  },
};

ResourceEditor.propTypes = {
  config: PropTypes.object.isRequired,
};

export default ResourceEditor;
