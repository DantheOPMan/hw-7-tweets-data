import React, { useState } from "react";
import FileUpload from "./components/FileUpload";
import Visualization from "./components/Visualization";

function App() {
  const [data, setData] = useState(null);

  return (
    <div>
      <FileUpload setData={setData} />
      {data && <Visualization data={data} />}
    </div>
  );
}

export default App;
