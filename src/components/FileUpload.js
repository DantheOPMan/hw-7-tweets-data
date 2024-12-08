import React, { Component } from "react";

class FileUpload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null,
    };
  }

  handleFileSubmit = async (event) => {
    event.preventDefault();
    const { file } = this.state;

    if (file) {
      try {
        const json = await this.readFileAsJson(file);
        if (this.props.setData) {
          this.props.setData(json);
        }
      } catch (error) {
        console.error("Error reading file:", error);
      }
    }
  };

  readFileAsJson = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (e) => reject(e.target.error);
      reader.readAsText(file);
    });
  };

  render() {
    return (
      <div style={{ backgroundColor: "#f0f0f0", padding: 20 }}>
        <h2>Upload a JSON File</h2>
        <form onSubmit={this.handleFileSubmit}>
          <input
            type="file"
            accept=".json"
            onChange={(event) => this.setState({ file: event.target.files[0] })}
          />
          <button type="submit">Upload</button>
        </form>
      </div>
    );
  }
}

export default FileUpload;
