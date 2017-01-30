//GLOBALS
var format = d3.format(",");
var sliderMargin = 65;

function circleSize(d) {
    return Math.sqrt(Math.abs(d));
}

function generate_swiss_projection(width, heigth) {
    return d3.geo.albers()
        .rotate([0, 0])
        .center([8.22, 46.83])
        .scale(16000)
        .translate([width / 2, heigth / 2])
        .precision(.1);
}

//Polarity map specific values
var polarity_width = 960,
    polarity_height = 600;

var polarity_container_id = "#first-section-contents";

var score_mapping = {
    'joy': 120,
    'trust': 100,
    'anticipation': 90,
    'surprise': 80,
    'fear': 10,
    'anger': 0,
    'sadness': -10,
    'disgust': -20
};

var polarity_callback = function (map, path, probe, canton_id_to_geometry, svg, g) {


    var hoverData, dateScale, sliderScale, slider;
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        months_full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        orderedColumns = [],
        currentFrame = 0,
        interval,
        frameLength = 500,
        isPlaying = false;

    var getMonthYear = function (column) {
        var m_y = column.split("-")[1].split("/");
        return [parseInt(m_y[0]), parseInt(m_y[1])];
    }

    var monthLabel = function (m) {
        var month_string = months_full[getMonthYear(m)[0] - 1];
        return "<span>" + month_string + "</span> " + getMonthYear(m)[1];
    }

    var createDateScale = function (columns) {
        var start = getMonthYear(columns[0]),
            end = getMonthYear(columns[columns.length - 1]);
        return d3.time.scale()
            .domain([new Date(start[1], start[0]), new Date(end[1], end[0])]);
    }


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


    var drawMonth = function (m, tween) {
        var circle = map.selectAll("circle")
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

        d3.select(polarity_container_id + " .date p.month").html(monthLabel(m));

        if (hoverData) {
            setProbeContent(hoverData);
        }
    }


    function animate() {
        interval = setInterval(function () {
            currentFrame++;

            if (currentFrame == orderedColumns.length) currentFrame = 0;

            d3.select(polarity_container_id + " .slider-div .d3-slider-handle")
                .style("left", 100 * currentFrame / orderedColumns.length + "%");
            slider.value(currentFrame)

            drawMonth(orderedColumns[currentFrame], true);

            if (currentFrame == orderedColumns.length - 1) {
                isPlaying = false;
                d3.select(polarity_container_id + " .play").classed("pause", false).attr("title", "Play animation");
                clearInterval(interval);
                return;
            }

        }, frameLength);
    }

    function sliderProbe() {
        var d = dateScale.invert((d3.mouse(this)[0]));
        d3.select(polarity_container_id + " .slider-probe")
            .style("left", d3.mouse(this)[0] + sliderMargin + "px")
            .style("display", "block")
            .select("p")
            .html(months[d.getMonth()] + " " + d.getFullYear())
    }

    var createSlider = function () {

        sliderScale = d3.scale.linear().domain([0, orderedColumns.length - 1]);

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
                drawMonth(orderedColumns[currentFrame], d3.event.type != "drag");
            })
            .on("slideend", function () {
                if (isPlaying) animate();
                d3.select(polarity_container_id + " .slider-div").on("mousemove", sliderProbe)
            })
            /*.on("slidestart", function () {
             d3.select("#slider-div").on("mousemove", null)
             })*/
            .value(val);

        d3.select(polarity_container_id + " .slider-div").remove();

        d3.select(polarity_container_id + " .slider-container")
            .append("div")
            .attr("class", "slider-div")
            .style("width", dateScale.range()[1] + "px")
            .on("mousemove", sliderProbe)
            .on("mouseout", function () {
                d3.select(polarity_container_id + " .slider-probe").style("display", "none");
            })
            .call(slider);

        d3.select(polarity_container_id + " .slider-div a").on("mousemove", function () {
            d3.event.stopPropagation();
        })

        var sliderAxis = d3.svg.axis()
            .scale(dateScale)
            .tickValues(dateScale.ticks(orderedColumns.length).filter(function (d, i) {
                console.log(d, i)
                //console.log(orderedColumns)
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

        d3.select(polarity_container_id + " .axis").remove();

        d3.select(polarity_container_id + " .slider-container")
            .append("svg")
            .attr("class", "axis")
            .attr("width", dateScale.range()[1] + sliderMargin * 2)
            .attr("height", 25)
            .append("g")
            .attr("transform", "translate(" + (sliderMargin + 1) + ",0)")
            .call(sliderAxis);

        d3.select(polarity_container_id + " .axis > g g:first-child text").attr("text-anchor", "end").style("text-anchor", "end");
        d3.select(polarity_container_id + " .axis > g g:last-of-type text").attr("text-anchor", "start").style("text-anchor", "start");
    }

    function resize() {
        var w = d3.select(polarity_container_id + " .main-container").node().offsetWidth,
            h = window.innerHeight - 80;
        var scale = Math.max(1, Math.min(w / polarity_width, h / polarity_height));
        svg
            .attr("width", polarity_width * scale)
            .attr("height", polarity_height * scale);
        g.attr("transform", "scale(" + scale + "," + scale + ")");

        d3.select(polarity_container_id + " .map-container").style("width", polarity_width * scale + "px");

        dateScale.range([0, 500 + w - polarity_width]);

        createSlider();
    }


    var cb = function (data) {

        var first = data[0];
        // get columns
        for (var mug in first) {
            if (mug != "Canton") {
                orderedColumns.push(mug);
            }
        }

        // draw city points
        for (var i in data) {

            var related_geometry = canton_id_to_geometry[data[i].Canton];
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
                            "top": (d3.event.pageY - 10) + "px",
                            "left": (d3.event.pageX - 250) + "px"
                        })
                })
                .on("mouseout", function () {
                    hoverData = null;
                    probe.style("display", "none");
                })
                .on("click" ,function (d) {
                    console.log(d);
                })
        }

        //createLegend();

        dateScale = createDateScale(orderedColumns).range([0, 500]);

        createSlider();

        d3.select(polarity_container_id + " .play")
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
        //window.onresize = resize;
        resize();

    }

    return cb;
}


function generate_map(container_id, width, height, cb) {
    var map_id = container_id + "_map";
    var probe_id = container_id + "_probe";

    var map_container_selector = container_id + " .map-container";
    var play_selector = container_id + " .play";
    var date_selector = container_id + " .date";

    var projection = generate_swiss_projection(width, height);

    var path = d3.geo.path()
        .projection(projection);

    var svg = d3.select(map_container_selector).append("svg")
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
            .attr("class", "land")
            .attr("d", path);

        map.append("path")
            .datum(topojson.mesh(canton_topoJson, canton_topoJson.objects.cantons, function (a, b) {
                return a !== b;
            }))
            .attr("class", "state-boundary")
            .attr("vector-effect", "non-scaling-stroke")
            .attr("d", path);

        probe = d3.select(map_container_selector).append("div")
            .attr("class", "probe");

        as_geojson.forEach(function (canton_geo) {
            canton_id_to_geometry[canton_geo.id] = canton_geo;
        });

        d3.csv("https://raw.githubusercontent.com/meryemmhamdi1/GMR_ADA_Project/master/Results/RandomResults4Viz.csv", function (data) {
            console.log("CSV downloaded");
            cb(map, path, probe, canton_id_to_geometry, svg, g)(data);
        });

    });
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


