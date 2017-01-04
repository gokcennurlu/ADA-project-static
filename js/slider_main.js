var width = 960,
  height = 600;

//d3.select("").style("height", height + "px");

var projection = d3.geo.albers()
  .rotate([0, 0])
  .center([8.22, 46.83])
  .scale(16000)
  .translate([width / 2, height / 2])
  .precision(.1);

var path = d3.geo.path()
  .projection(projection);

var svg = d3.select("#map-container").append("svg")
  .attr("width", width)
  .attr("height", height);

var g = svg.append("g");

g.append("rect")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "white")
  .attr("opacity", 0)
  .on("mouseover", function () {
    hoverData = null;
    if (probe) probe.style("display", "none");
  })

var map = g.append("g")
  .attr("id", "map");

var probe,
  hoverData;

var dateScale, sliderScale, slider;

var format = d3.format(",");

var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  months_full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  orderedColumns = [],
  currentFrame = 0,
  interval,
  frameLength = 500,
  isPlaying = false;
  canton_id_to_geometry = {};

var score_mapping = {
    'joy': 120,
    'trust': 100,
    'anticipation': 90,
    'surprise': 80,
    'fear': 10,
    'anger': 0,
    'sadness':-10,
    'disgust':-20
};

var sliderMargin = 65;

function circleSize(d) {
  return Math.sqrt(Math.abs(d));
};

var as_geojson;

d3.json("data/swiss.topojson.json", function (error, canton_topoJson) {
  as_geojson = topojson.feature(canton_topoJson, canton_topoJson.objects.cantons).features
  map.selectAll("path")
    .data(as_geojson)
    .enter()
    .append("path")
    .attr("vector-effect", "non-scaling-stroke")
    .attr("class", "land")
    .attr("d", path);

  map.append("path")
    .datum(topojson.mesh(canton_topoJson, canton_topoJson.objects.cantons, function (a, b) { return a !== b; }))
    .attr("class", "state-boundary")
    .attr("vector-effect", "non-scaling-stroke")
    .attr("d", path);

  probe = d3.select("#map-container").append("div")
    .attr("id", "probe");

  d3.select("body")
    .append("div")
    .attr("id", "loader")
    .style("top", d3.select("#play").node().offsetTop + "px")
    .style("height", d3.select("#date").node().offsetHeight + d3.select("#map-container").node().offsetHeight + "px")


  as_geojson.forEach(function(canton_geo) {
    canton_id_to_geometry[canton_geo.id] = canton_geo;
  });

  d3.csv("https://raw.githubusercontent.com/meryemmhamdi1/GMR_ADA_Project/master/Results/RandomResults4Viz.csv", function (data) {
    var first = data[0];
    // get columns
    for (var mug in first) {
      if (mug != "Canton") {
        orderedColumns.push(mug);
      }
    }

    // draw city points 
    for (var i in data) {
      
      related_geometry = canton_id_to_geometry[data[i].Canton];
      console.log("Processing", related_geometry.id);
      var projected = path.centroid(related_geometry);
      //var projected = projection([parseFloat(data[i].LON), parseFloat(data[i].LAT)])
      map.append("circle")
        .datum(data[i])
        .attr("cx", projected[0])
        .attr("cy", projected[1])
        .attr("r", 1)
        .attr("vector-effect", "non-scaling-stroke")
        .on("mousemove", function (d) {
          hoverData = d;
          setProbeContent(d);
          probe
            .style({
              "display": "block",
              "top": (d3.event.pageY - 80) + "px",
              "left": (d3.event.pageX + 10) + "px"
            })
        })
        .on("mouseout", function () {
          hoverData = null;
          probe.style("display", "none");
        })
    }

    //createLegend();

    dateScale = createDateScale(orderedColumns).range([0, 500]);

    createSlider();

    d3.select("#play")
      .attr("title", "Play animation")
      .on("click", function () {
        if (!isPlaying) {
          isPlaying = true;
          d3.select(this).classed("pause", true).attr("title", "Pause animation");
          animate();
        } else {
          isPlaying = false;
          d3.select(this).classed("pause", false).attr("title", "Play animation");
          clearInterval(interval);
        }
      });

    drawMonth(orderedColumns[currentFrame]); // initial map

    window.onresize = resize;
    resize();

    d3.select("#loader").remove();

  })

});

function drawMonth(m, tween) {
  var circle = map.selectAll("circle")
    /*.sort(function (a, b) {
      // catch nulls, and sort circles by size (smallest on top)
      if (isNaN(a[m])) a[m] = 0;
      if (isNaN(b[m])) b[m] = 0;
      return Math.abs(b[m]) - Math.abs(a[m]);
    })*/
    .attr("class", function (d) {
      return score_mapping[d[m]] > 0 ? "gain" : "loss";
    })
  if (tween) {
    circle
      .transition()
      .ease("linear")
      .duration(frameLength)
      .attr("r", function (d) {
        return circleSize(score_mapping[d[m]])
      });
  } else {
    circle.attr("r", function (d) {
      return circleSize(score_mapping[d[m]])
    });
  }

  d3.select("#date p#month").html(monthLabel(m));

  if (hoverData) {
    setProbeContent(hoverData);
  }
}

function animate() {
  interval = setInterval(function () {
    currentFrame++;

    if (currentFrame == orderedColumns.length) currentFrame = 0;

    d3.select("#slider-div .d3-slider-handle")
      .style("left", 100 * currentFrame / orderedColumns.length + "%");
    slider.value(currentFrame)

    drawMonth(orderedColumns[currentFrame], true);

    if (currentFrame == orderedColumns.length - 1) {
      isPlaying = false;
      d3.select("#play").classed("pause", false).attr("title", "Play animation");
      clearInterval(interval);
      return;
    }

  }, frameLength);
}

function createSlider() {

  sliderScale = d3.scale.linear().domain([0, orderedColumns.length - 1]);

  var val = slider ? slider.value() : 0;

  slider = d3.slider()
    .scale(sliderScale)
    .on("slide", function (event, value) {
      if (isPlaying) {
        clearInterval(interval);
      }
      new_value = Math.floor(value);
      if(new_value != currentFrame){
        currentFrame = new_value;
        console.log("Updated!", currentFrame)
      }
      drawMonth(orderedColumns[currentFrame], d3.event.type != "drag");
    })
    .on("slideend", function () {
      if (isPlaying) animate();
      d3.select("#slider-div").on("mousemove", sliderProbe)
    })
    /*.on("slidestart", function () {
      d3.select("#slider-div").on("mousemove", null)
    })*/
    .value(val);

  d3.select("#slider-div").remove();

  d3.select("#slider-container")
    .append("div")
    .attr("id", "slider-div")
    .style("width", dateScale.range()[1] + "px")
    .on("mousemove", sliderProbe)
    .on("mouseout", function () {
      d3.select("#slider-probe").style("display", "none");
    })
    .call(slider);

  d3.select("#slider-div a").on("mousemove", function () {
    d3.event.stopPropagation();
  })

  var sliderAxis = d3.svg.axis()
    .scale(dateScale)
    .tickValues(dateScale.ticks(orderedColumns.length).filter(function (d, i) {
      console.log(d,i)
      //console.log(orderedColumns)
      // ticks only for beginning of each year, plus first and last
      return d.getMonth() == 0 || i == 0 || (i == orderedColumns.length - 1) || d.getMonth()%6 == 0;
      //return true;
    }))
    .tickFormat(function (d) {
      // abbreviated year for most, full month/year for the ends
      //if (d.getMonth() == 0) return "'" + d.getFullYear().toString().substr(2);
      return months[d.getMonth()] + " " + d.getFullYear();
    })
    //.tickSize(10)

  d3.select("#axis").remove();

  d3.select("#slider-container")
    .append("svg")
    .attr("id", "axis")
    .attr("width", dateScale.range()[1] + sliderMargin * 2)
    .attr("height", 25)
    .append("g")
    .attr("transform", "translate(" + (sliderMargin + 1) + ",0)")
    .call(sliderAxis);

  d3.select("#axis > g g:first-child text").attr("text-anchor", "end").style("text-anchor", "end");
  d3.select("#axis > g g:last-of-type text").attr("text-anchor", "start").style("text-anchor", "start");
}

/*function createLegend() {
  var legend = g.append("g").attr("id", "legend").attr("transform", "translate(560,10)");

  legend.append("circle").attr("class", "gain").attr("r", 5).attr("cx", 5).attr("cy", 10)
  legend.append("circle").attr("class", "loss").attr("r", 5).attr("cx", 5).attr("cy", 30)

  legend.append("text").text("jobs gained").attr("x", 15).attr("y", 13);
  legend.append("text").text("jobs lost").attr("x", 15).attr("y", 33);

  var sizes = [10000, 100000, 250000];
  for (var i in sizes) {
    legend.append("circle")
      .attr("r", circleSize(sizes[i]))
      .attr("cx", 80 + circleSize(sizes[sizes.length - 1]))
      .attr("cy", 2 * circleSize(sizes[sizes.length - 1]) - circleSize(sizes[i]))
      .attr("vector-effect", "non-scaling-stroke");
    legend.append("text")
      .text((sizes[i] / 1000) + "K" + (i == sizes.length - 1 ? " jobs" : ""))
      .attr("text-anchor", "middle")
      .attr("x", 80 + circleSize(sizes[sizes.length - 1]))
      .attr("y", 2 * (circleSize(sizes[sizes.length - 1]) - circleSize(sizes[i])) + 5)
      .attr("dy", 13)
  }
}*/

function setProbeContent(d) {
  var val = score_mapping[d[orderedColumns[currentFrame]]],
    m_y = getMonthYear(orderedColumns[currentFrame]),
    month = months_full[m_y[0]];
  var html = "<strong>" + d.Canton + "</strong><br/>" +
    format(Math.abs(val)) + " mood level <br/>" +
    "<span>" + month + " " + m_y[1] + "</span>";
  probe
    .html(html);
}

function sliderProbe() {
  var d = dateScale.invert((d3.mouse(this)[0]));
  d3.select("#slider-probe")
    .style("left", d3.mouse(this)[0] + sliderMargin + "px")
    .style("display", "block")
    .select("p")
    .html(months[d.getMonth()] + " " + d.getFullYear())
}

function resize() {
  var w = d3.select("#container").node().offsetWidth,
    h = window.innerHeight - 80;
  var scale = Math.max(1, Math.min(w / width, h / height));
  svg
    .attr("width", width * scale)
    .attr("height", height * scale);
  g.attr("transform", "scale(" + scale + "," + scale + ")");

  d3.select("#map-container").style("width", width * scale + "px");

  dateScale.range([0, 500 + w - width]);

  createSlider();
}

function createDateScale(columns) {
  var start = getMonthYear(columns[0]),
    end = getMonthYear(columns[columns.length - 1]);
  return d3.time.scale()
    .domain([new Date(start[1], start[0]), new Date(end[1], end[0])]);
}

function getMonthYear(column) {
  var m_y = column.split("-")[1].split("/");
  return [parseInt(m_y[0]), parseInt(m_y[1])];
}

function monthLabel(m) {
  var month_string = months_full[getMonthYear(m)[0]-1];
  return "<span>" + month_string + "</span> " + getMonthYear(m)[1];
}