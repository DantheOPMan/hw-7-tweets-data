import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const Visualization = ({ data }) => {
  const svgRef = useRef();
  const [colorBy, setColorBy] = useState("Sentiment");
  const [selectedTweets, setSelectedTweets] = useState([]);

  // Base scales for circle colors:
  const sentimentColorScale = d3
    .scaleLinear()
    .domain([-1, 0, 1])
    .range(["red", "#ECECEC", "green"]);

  // Subjectivity scale for legend (inverted for dots only):
  const subjectivityColorScale = d3
    .scaleLinear()
    .domain([0, 1])
    .range(["#4467C4", "#ECECEC"]);

  const getColorScale = () =>
    colorBy === "Sentiment" ? sentimentColorScale : subjectivityColorScale;

  function createSteppedColors(startColor, endColor, steps) {
    const scale = d3
      .scaleLinear()
      .domain([0, steps - 1])
      .range([startColor, endColor])
      .interpolate(d3.interpolateLab);
    const colors = [];
    for (let i = 0; i < steps; i++) {
      colors.push(scale(i));
    }
    return colors;
  }

  // Prepare 20-color arrays for the legend
  const greenToNeutral = createSteppedColors("green", "#ECECEC", 11);
  const neutralToRed = createSteppedColors("#ECECEC", "red", 10);
  const sentimentColors = [...greenToNeutral, ...neutralToRed.slice(1)];
  const subjectivityColors = createSteppedColors("#4467C4", "#ECECEC", 20);

  useEffect(() => {
    const slicedData = data.slice(0, 300);

    const width = 1200;
    const height = 600;
    const margin = { top: 50, right: 150, bottom: 50, left: 100 };

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove(); 

    const months = ["March", "April", "May"];

    const yScale = d3
      .scaleBand()
      .domain(months)
      .range([margin.top, height - margin.bottom])
      .padding(0.3);

    // Compute counts per month
    const monthCounts = months.map(month => slicedData.filter(d => d.Month === month).length);
    const totalCount = d3.sum(monthCounts);

    // Define the total available width inside margins
    const totalAvailableWidth = width - margin.left - margin.right;

    // Define the desired total cluster width (100% of available width)
    const desiredClusterTotalWidth = totalAvailableWidth;

    // Calculate widths for each cluster proportional to their counts
    const monthWidths = monthCounts.map(count => (count / totalCount) * desiredClusterTotalWidth);

    // Verify that monthWidths sum up to desiredClusterTotalWidth
    const totalClusterWidth = d3.sum(monthWidths);
    // Due to floating point precision, you might get a very slight difference
    // So, it's good to normalize them if needed, but generally, it's fine.

    // Calculate starting x to center the entire group of clusters
    const startX = margin.left; // Since desiredClusterTotalWidth equals totalAvailableWidth

    // Define manual shifts for each month
    const shifts = { March: 200, April: -150, May: -400 }; // Adjust these values as needed

    // Initialize cumulativeX with startX
    let cumulativeX = startX;

    const monthScales = {};
    for (let i = 0; i < months.length; i++) {
      const month = months[i];
      const monthData = slicedData.filter(d => d.Month === month);
      const dim1Values = monthData.map(d => d["Dimension 1"]);
      const dim1Min = d3.min(dim1Values);
      const dim1Max = d3.max(dim1Values);
      const dim1Median = d3.median(dim1Values);

      const halfRange = (dim1Max - dim1Min) / 2;
      const domainMin = dim1Median - halfRange;
      const domainMax = dim1Median + halfRange;

      const clusterWidth = monthWidths[i];
      const shift = shifts[month] || 0; // Default to 0 if no shift defined

      const xRange = [cumulativeX + shift, cumulativeX + clusterWidth + shift];

      monthScales[month] = d3.scaleLinear()
        .domain([domainMin, domainMax])
        .range(xRange);

      cumulativeX += clusterWidth;
    }

    // Force Simulation
    const simulation = d3
      .forceSimulation(slicedData)
      .force("x", d3.forceX(d => monthScales[d.Month](d["Dimension 1"])).strength(0.7)) // Increased strength for better centering
      .force("y", d3.forceY(d => yScale(d.Month) + yScale.bandwidth() / 2).strength(0.7)) // Increased strength for better centering
      .force("collide", d3.forceCollide(7.5))
      .stop();

    // Increase simulation ticks for better convergence
    for (let i = 0; i < 500; i++) simulation.tick();

    // Y-Axis
    const yAxisGroup = svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).tickSize(0));

    yAxisGroup.selectAll("text")
      .attr("font-size", "14px")
      .attr("font-weight", "bold");
    yAxisGroup.select(".domain").remove();

    // Circles
    const circles = svg
      .selectAll("circle")
      .data(slicedData)
      .join("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 6)
      .attr("stroke", d =>
        selectedTweets.find(t => t.idx === d.idx) ? "black" : "none"
      )
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", handleTweetClick);

    updateCircleColors(circles);

    // Legend Group
    svg.append("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

    drawLegend(svg, colorBy);

    // Optional: Add temporary visual guides for debugging (remove in final version)
    /*
    months.forEach((month, i) => {
      const clusterWidth = monthWidths[i];
      const xStart = startX + d3.sum(monthWidths.slice(0, i)) + (shifts[month] || 0);
      svg.append("rect")
        .attr("x", xStart)
        .attr("y", margin.top - 20)
        .attr("width", clusterWidth)
        .attr("height", 20)
        .attr("fill", "none")
        .attr("stroke", "blue");
    });
    */

    function handleTweetClick(event, d) {
      event.stopPropagation();
      setSelectedTweets(prevSelected => {
        const isSelected = prevSelected.find(t => t.idx === d.idx);
        if (isSelected) {
          return prevSelected.filter(t => t.idx !== d.idx);
        }
        return [d, ...prevSelected];
      });
    }
  }, [data]);  

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Update circle colors and strokes
    const circles = svg.selectAll("circle")
      .attr("stroke", (d) =>
        selectedTweets.find((t) => t.idx === d.idx) ? "black" : "none"
      );

    updateCircleColors(circles);
    drawLegend(svg, colorBy);
  }, [colorBy, selectedTweets]);

  function updateCircleColors(circles) {
    const colorScale = getColorScale();
    circles
      .transition()
      .duration(500)
      .attr("fill", (d) => {
        if (colorBy === "Sentiment") {
          return colorScale(d[colorBy]); // no inversion for sentiment
        } else {
          // Invert subjectivity for dots only
          const val = d[colorBy];
          const invertedVal = 1 - val; 
          return colorScale(invertedVal);
        }
      });
  }

  function drawLegend(svg, mode) {
    svg.select("#legend-gradient").remove();
    const legend = svg.select(".legend-group");
    legend.selectAll("text").remove();

    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    let chosenColors;
    let topLabel;
    let bottomLabel;

    if (mode === "Sentiment") {
      chosenColors = sentimentColors;
      topLabel = "Positive";
      bottomLabel = "Negative";
    } else {
      chosenColors = subjectivityColors;
      topLabel = "Subjective";
      bottomLabel = "Objective";
    }

    const steps = chosenColors.length; // 20
    const bandSize = 100 / steps; // 5% per step
    const stops = [];

    chosenColors.forEach((color, i) => {
      const start = i * bandSize;
      const end = (i + 1) * bandSize;
      stops.push({ offset: start + "%", color });
      stops.push({ offset: end + "%", color });
    });

    gradient.selectAll("stop")
      .data(stops)
      .enter()
      .append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    legend.select("rect").remove();
    legend.append("rect")
      .attr("width", 20)
      .attr("height", 150)
      .style("fill", "url(#legend-gradient)");

    legend.append("text")
      .attr("x", 25)
      .attr("y", 10)
      .text(topLabel)
      .attr("font-size", "12px")
      .attr("font-weight", "bold");

    legend.append("text")
      .attr("x", 25)
      .attr("y", 160)
      .text(bottomLabel)
      .attr("font-size", "12px")
      .attr("font-weight", "bold");
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <label>
          Color by:
          <select
            value={colorBy}
            onChange={(e) => setColorBy(e.target.value)}
            style={{ marginLeft: "10px" }}
          >
            <option value="Sentiment">Sentiment</option>
            <option value="Subjectivity">Subjectivity</option>
          </select>
        </label>
      </div>
      <svg ref={svgRef}></svg>
      <div style={{ marginTop: "20px" }}>
        <h3>Selected Tweets</h3>
        <ul>
          {selectedTweets.map((tweet) => (
            <li key={tweet.idx}>{tweet.RawTweet}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Visualization;
