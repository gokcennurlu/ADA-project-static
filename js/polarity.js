//GLOBALS
var format = d3.format(",");
var sliderMargin = 65;

function circleSize(d) {
    return Math.abs(d) * 0.0005;
}

function generate_swiss_projection(width, heigth) {
    return d3.geo.albers()
        .rotate([0, 0])
        .center([8.42, 46.83])
        .scale(15000)
        .translate([width / 2, heigth / 2])
        .precision(.1);
}


var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    months_full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

var type_format_mappers = {
    "season": (function () {
        var year_list = [2012, 2013, 2014, 2015, 2016];
        var season_map = {
            "winter": 0,
            "spring": 3,
            "summer": 6,
            "fall": 9
        }

        var get_month_year = function (column) {
            var season_tag = column.split("_")[0];
            var month_integer = season_map[season_tag.substring(0, season_tag.length - 1)];
            var year_integer = year_list[parseInt(season_tag.substr(season_tag.length - 1)) - 1];
            return [year_integer, month_integer];
        }
        var parser = function (column) {
            //generates Date object out of that column string
            // like "winter1_Polarity"
            var integers = get_month_year(column);
            return new Date(integers[0], integers[1]);
        };

        var printer = function (column) {
            var integers = get_month_year(column);
            return months[integers[1]] + " " + integers[0];
        }

        return {
            "parser": parser,
            "printer": printer
        }
    })()
}

var draw_line_chart = function (values, target) {
    var parseDate = d3.time.format("%d-%b-%y").parse;

// Set the ranges
    var x = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);

// Define the axes
    var xAxis = d3.svg.axis().scale(x)
        .orient("bottom").ticks(5);

    var yAxis = d3.svg.axis().scale(y)
        .orient("left").ticks(5);

// Define the line
    var valueline = d3.svg.line()
        .x(function (d) {
            return x(d.date);
        })
        .y(function (d) {
            return y(d.close);
        });

// Adds the svg canvas
    var svg = d3.select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    data.forEach(function (d) {
        d.date = parseDate(d.date);
        d.close = +d.close;
    });

    // Scale the range of the data
    x.domain(d3.extent(data, function (d) {
        return d.date;
    }));
    y.domain([0, d3.max(data, function (d) {
        return d.close;
    })]);

    // Add the valueline path.
    svg.append("path")
        .attr("class", "line")
        .attr("d", valueline(data));

    // Add the X Axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // Add the Y Axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
}

var map_populator_callback = function (_container_id, _width, _height, map, path, probe, canton_id_to_geometry, svg, g, data_source) {

    var VALUES_CSV = data_source.data[0];
    var COUNT_CSV = data_source.data[1];

    var hoverData, dateScale, slider;
    var orderedColumns = [],
        currentFrame = 0,
        interval,
        frameLength = 500,
        isPlaying = false;

    var column_to_date = type_format_mappers[data_source.type].parser;
    var column_printer = type_format_mappers[data_source.type].printer;


    var createScale = function (columns) {
        var start = column_to_date(columns[0]),
            end = column_to_date(columns[columns.length - 1]);
        return d3.time.scale().domain([start, end]);
    }


    var setProbeContent = function (d) {
        var val = d[orderedColumns[currentFrame]];
        var html = "<strong>" + (d.canton || d.Canton) + "</strong><br/>Mood level " +
            format(Math.abs(val)) + "<br/><span>" + column_printer(orderedColumns[currentFrame]) + "</span>";
        probe.html(html);
    }

    var getColor = function (valueIn, valuesIn) {

        var color = d3.scale.linear() // create a linear scale
            .domain([valuesIn[0], valuesIn[1]])  // input uses min and max values
            .range([0.1, 1]);   // output for opacity between .3 and 1 %

        return color(valueIn);  // return that number to the caller
    }

    var drawFrame = function (raw_column_string, tween) {
        var circle = map.selectAll("circle")
        /*.attr("class", function (d) {
         return d[raw_column_string] > 0 ? "gain" : "loss";
         })*/
        if (tween) {
            circle
                .transition()
                .ease("linear")
                .duration(frameLength)
                .attr("r", function (d) {
                    if (canton_to_count_map) {
                        var count = canton_to_count_map[d.canton][raw_column_string];
                        return circleSize(count);
                    }
                    return 0;
                });
        } else {
            circle.attr("r", function (d) {
                if (canton_to_count_map) {
                    var count = canton_to_count_map[d.canton][raw_column_string];
                    return circleSize(count);
                }
                return 0;
            });
        }

        d3.select(_container_id + " .date p.month").html(column_printer(raw_column_string));

        if (hoverData) {
            setProbeContent(hoverData);
        }


        //var dataRange = getDataRange(); // get the min/max values from the current year's range of data values
        map.selectAll('.canton').transition()  //select all the cantons and prepare for a transition to new values
            .duration(100)  // give it a smooth time period for the transition
            .attr('fill-opacity', function (d) {
                var val = canton_to_data_map[d.id][raw_column_string];

                var transparency = getColor(Math.abs(val), [0, 1]);
                return transparency;// the end color value
            })
            .attr('fill', function (d) {
                var val = canton_to_data_map[d.id][raw_column_string];
                if (val > 0)
                    return "steelblue"
                else
                    return "red"
            });
    }


    var animate = function () {
        interval = setInterval(function () {
            currentFrame++;

            if (currentFrame == orderedColumns.length) currentFrame = 0;

            d3.select(_container_id + " .slider-div .d3-slider-handle")
                .style("left", 100 * currentFrame / orderedColumns.length + "%");
            slider.value(currentFrame)

            drawFrame(orderedColumns[currentFrame], true);

            if (currentFrame == orderedColumns.length - 1) {
                isPlaying = false;
                d3.select(_container_id + " .play").classed("pause", false).attr("title", "Play animation");
                clearInterval(interval);
                return;
            }

        }, frameLength);
    }

    var sliderProbe = function () {
        var d = dateScale.invert((d3.mouse(this)[0]));
        d3.select(_container_id + " .slider-probe")
            .style("left", d3.mouse(this)[0] + sliderMargin + "px")
            .style("display", "block")
            .select("p")
            .html(months[d.getMonth()] + " " + d.getFullYear())
    }

    var createSlider = function () {

        var sliderScale = d3.scale.linear().domain([0, orderedColumns.length - 1]);
        var val = slider ? slider.value() : 0;

        slider = d3.slider()
            .scale(sliderScale)
            .on("slide", function (event, value) {
                if (isPlaying) {
                    clearInterval(interval);
                }
                new_value = Math.floor(value);
                if (new_value != currentFrame) {
                    currentFrame = new_value;
                    console.log("Updated!", currentFrame)
                }
                drawFrame(orderedColumns[currentFrame], d3.event.type != "drag");
            })
            .on("slideend", function () {
                if (isPlaying) animate();
                d3.select(_container_id + " .slider-div").on("mousemove", sliderProbe)
            })
            /*.on("slidestart", function () {
             d3.select("#slider-div").on("mousemove", null)
             })*/
            .value(val);

        d3.select(_container_id + " .slider-div").remove();

        d3.select(_container_id + " .slider-container")
            .append("div")
            .attr("class", "slider-div")
            .style("width", dateScale.range()[1] + "px")
            .on("mousemove", sliderProbe)
            .on("mouseout", function () {
                d3.select(_container_id + " .slider-probe").style("display", "none");
            })
            .call(slider);

        d3.select(_container_id + " .slider-div a").on("mousemove", function () {
            d3.event.stopPropagation();
        })

        var sliderAxis = d3.svg.axis()
            .scale(dateScale)
            .tickValues(dateScale.ticks(orderedColumns.length).filter(function (d, i) {
                // ticks only for beginning of each year, plus first and last
                return d.getMonth() == 0 || i == 0 || (i == orderedColumns.length - 1) || d.getMonth() % 6 == 0;
                //return true;
            }))
            .tickFormat(function (d) {
                // abbreviated year for most, full month/year for the ends
                //if (d.getMonth() == 0) return "'" + d.getFullYear().toString().substr(2);
                return months[d.getMonth()] + " " + d.getFullYear();
            })
        //.tickSize(10)

        d3.select(_container_id + " .axis").remove();

        d3.select(_container_id + " .slider-container")
            .append("svg")
            .attr("class", "axis")
            .attr("width", dateScale.range()[1] + sliderMargin * 2)
            .attr("height", 25)
            .append("g")
            .attr("transform", "translate(" + (sliderMargin + 1) + ",0)")
            .call(sliderAxis);

        d3.select(_container_id + " .axis > g g:first-child text").attr("text-anchor", "end").style("text-anchor", "end");
        d3.select(_container_id + " .axis > g g:last-of-type text").attr("text-anchor", "start").style("text-anchor", "start");
    }

    var resize = function () {
        var w = d3.select(_container_id + " .main-container").node().offsetWidth,
            h = window.innerHeight - 80;
        var scale = Math.max(1, Math.min(w / _width, h / _height));
        //console.log(w, _width)
        // console.log(h, _height);
        /*svg
         .attr("width", _width * scale)
         .attr("height", _height * scale);
         g.attr("transform", "scale(" + scale + "," + scale + ")");

         d3.select(_container_id + " .map-container").style("width", _width * scale + "px");
         */
        dateScale.range([0, 500 + w - _width]);

        createSlider();
    }

    var canton_to_data_map = null;
    var canton_to_count_map = null;


    var cb = function (data) {

        canton_to_data_map = {};


        var first = data[0];
        // get columns
        for (var mug in first) {
            if (mug.toLowerCase() != "canton") {
                orderedColumns.push(mug);
            }
        }

        // draw city points
        for (var i in data) {

            canton_to_data_map[data[i].canton || data[i].Canton] = data[i];

            var related_geometry = canton_id_to_geometry[data[i].canton || data[i].Canton];
            var projected = path.centroid(related_geometry);
            //var projected = projection([parseFloat(data[i].LON), parseFloat(data[i].LAT)])
            map.append("circle")
                .datum(data[i])
                .attr("cx", projected[0])
                .attr("cy", projected[1])
                .attr("r", 1)
                .attr("vector-effect", "non-scaling-stroke")
        }

        map.selectAll('.canton')
            .on("mousemove", function (d) {
                var canton_data = canton_to_data_map[d.id];
                hoverData = canton_data;
                setProbeContent(canton_data);
                probe
                    .style({
                        "display": "block",
                        "top": (d3.event.pageY + 30) + "px",
                        "left": (d3.event.pageX + 30) + "px"
                    })
            })
            .on("mouseout", function () {
                hoverData = null;
                probe.style("display", "none");
            })
            .on("click", function (d) {
                console.log(d);
            })

        //createLegend();

        dateScale = createScale(orderedColumns).range([0, 500]);

        //createSlider();

        d3.select(_container_id + " .play")
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

        drawFrame(orderedColumns[currentFrame]); // initial map
        //window.onresize = resize;
        resize();

    }

    d3.csv(VALUES_CSV, function (data) {
        cb(data);
    });

    d3.csv(COUNT_CSV, function (data) {
        canton_to_count_map = {};
        for (var i in data) {
            canton_to_count_map[data[i].canton || data[i].Canton] = data[i];
        }
    });
}

function generate_map(data_source, container_id, width, height, cb) {
    var play_selector = container_id + " .play";
    var date_selector = container_id + " .date";

    var projection = generate_swiss_projection(width, height);

    var path = d3.geo.path()
        .projection(projection);

    var svg = d3.select(container_id + " .map-container").append("svg")
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
        });


    var map = g.append("g")
        .attr("class", "map");

    var probe,
        hoverData;

    var canton_id_to_geometry = {};

    d3.json("data/swiss.topojson.json", function (error, canton_topoJson) {
        var as_geojson = topojson.feature(canton_topoJson, canton_topoJson.objects.cantons).features;

        map.selectAll("path")
            .data(as_geojson)
            .enter()
            .append("path")
            .attr("vector-effect", "non-scaling-stroke")
            .attr("class", "canton")
            .attr("d", path);


        map.append("path")
            .datum(topojson.mesh(canton_topoJson, canton_topoJson.objects.cantons, function (a, b) {
                return a !== b;
            }))
            .attr("class", "state-boundary")
            .attr("vector-effect", "non-scaling-stroke")
            .attr("d", path);

        probe = d3.select('body').append("div")
            .attr("id", container_id.substr(1) + "-probe")
            .attr("class", "probe");

        as_geojson.forEach(function (canton_geo) {
            canton_id_to_geometry[canton_geo.id] = canton_geo;
        });

        cb(container_id, width, height, map, path, probe, canton_id_to_geometry, svg, g, data_source); //initial loading
    });

    return {
        "container_id": container_id,
        "width": width,
        "height": height,
        "map": map,
        "path": path,
        "probe": probe,
        "canton_id_geometry": canton_id_to_geometry,
        "svg": svg,
        "g": g
    }
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

