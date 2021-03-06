RadarChart.defaultConfig.w = 300;
RadarChart.defaultConfig.h = 300;


var emotions = [
    "Anger", "Anticipation", "Disgust", "Fear", "Joy", "Sadness", "Surprise", "Trust"
];


var svg_map = {
    "Anger": "https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/svg/1f621.svg",
    "Anticipation": "https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/svg/1f917.svg",
    "Disgust": "https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/svg/1f620.svg",
    "Fear": "https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/svg/1f631.svg",
    "Joy": "https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/svg/1f603.svg",
    "Sadness": "https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/svg/1f61e.svg",
    "Surprise": "https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/svg/1f632.svg",
    "Trust": "https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/svg/1f60c.svg"
};

var transparency_map = {
    "Anger": 0.9,
    "Anticipation": 0.2,
    "Disgust": 0.5,
    "Fear": 0.1,
    "Joy": 0.9,
    "Sadness": 0.5,
    "Surprise": 0.4,
    "Trust": 0.6
};

var YELLOW = "#ffff66";
var RED = "#ff6666";

var color_map = {
    "Anger": RED,
    "Anticipation": YELLOW,
    "Disgust": RED,
    "Fear": RED,
    "Joy": YELLOW,
    "Sadness": RED,
    "Surprise": YELLOW,
    "Trust": YELLOW
};

var get_best_emotion = function (data) {
    return Object.keys(data).reduce(function (a, b) {
        return data[a] > data[b] ? a : b
    });
};

var emotion_type_format_mappers = {
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
            "printer": printer,
            "tick_count": 5,
            "circle_multiplier": 1
        }
    })(),

    "daily": (function () {

        var parser = function (column) {
            //generates Date object out of that column string
            // like "YYYY,MM,DD"
            return new Date(column.split("_")[0].split(",").join("-"));
        };

        var printer = function (column) {
            return column.split("_")[0].split(",").join("-");
        }

        return {
            "parser": parser,
            "printer": printer,
            "tick_count": 5,
            "circle_multiplier": 100
        }
    })(),

    "days7": (function () {

        var column_maps = {
            "fridays": 5,
            "mondays": 1,
            "saturdays": 6,
            "sundays": 7,
            "thursdays": 4,
            "tusedays": 2,
            "wednsdays": 3
        }

        var column_str_maps = {
            "fridays": "Friday",
            "mondays": "Monday",
            "saturdays": "Saturday",
            "sundays": "Sunday",
            "thursdays": "Thursday",
            "tusedays": "Tuesday",
            "wednsdays": "Wednesday"
        }

        var parser = function (column) {
            //generates Date object out of that column string
            // like "YYYY,MM,DD"
            var date = new Date();
            var currentDay = date.getDay();
            var distance = column_maps[column] - currentDay;
            date.setDate(date.getDate() + distance);
            //console.log(column, date);
            return date;
        };

        var printer = function (column) {
            return column_str_maps[column];
        }

        return {
            "parser": parser,
            "printer": printer,
            "tick_count": -1,
            "circle_multiplier": 0.5
        }
    })(),

    "monthly": (function () {
        var parser = function (column) {
            //generates Date object out of that column string
            // like "YYYY_MM_blabla"
            return new Date(column.split("_").join("-") + "-01");
        };

        var printer = function (column) {
            return column.split("_").join("-");
        }

        return {
            "parser": parser,
            "printer": printer,
            "tick_count": 16,
            "circle_multiplier": 3.5
        }
    })(),
    "weekly": (function () {
        var dateFromDay = function (year, day) {
            var date = new Date(year, 0); // initialize a date in `year-01-01`
            return new Date(date.setDate(day)); // add the number of days
        }

        var parser = function (column) {
            //generates Date object out of that column string
            // like "YYYY__WEEKNUMBER_blabla"
            var year = parseInt(column.split("_")[0]);
            var week_num = parseInt(column.split("_")[1]);
            return dateFromDay(year, week_num * 7);
        };

        var printer = function (column) {
            return column.split("_").join("-");
        }

        return {
            "parser": parser,
            "printer": printer,
            "tick_count": 16,
            "circle_multiplier": 16
        }
    })()
}
/*
 var draw_line_chart = function (values, target) {
 var margin = {top: 30, right: 20, bottom: 30, left: 50},
 width = 400 - margin.left - margin.right,
 height = 270 - margin.top - margin.bottom;

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
 return y(d.value);
 });

 // Adds the svg canvas
 d3.select(target + " svg").remove();

 var svg = d3.select(target)
 .append("svg")
 .attr("width", width + margin.left + margin.right)
 .attr("height", height + margin.top + margin.bottom)
 .append("g")
 .attr("transform",
 "translate(" + margin.left + "," + margin.top + ")");

 // Scale the range of the data
 x.domain(d3.extent(values, function (d) {
 return d.date;
 }));
 y.domain([0, d3.max(values, function (d) {
 return d.value;
 })]);

 // Add the valueline path.
 svg.append("path")
 .attr("class", "line")
 .attr("d", valueline(values));

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
 */
var emotion_map_populator_callback = function (_container_id, _width, _height, map, path, probe_selector, canton_id_to_geometry, svg, g, data_source) {

    var current_canton = null;

    var probe = d3.select(probe_selector);

    var VALUES_CSV = data_source.data[0];
    var COUNT_CSV = data_source.data[1];

    var hoverData, dateScale, slider;
    var orderedColumns = [],
        currentFrame = 0,
        interval,
        frameLength = 1000,
        isPlaying = false;

    var column_to_date = emotion_type_format_mappers[data_source.type].parser;
    var column_printer = emotion_type_format_mappers[data_source.type].printer;
    var tick_count = emotion_type_format_mappers[data_source.type].tick_count;
    var circle_multiplier = emotion_type_format_mappers[data_source.type].circle_multiplier;

    var draw_radar = function (canton_name) {
        if(current_canton) {
            var canton_data = canton_to_data_map[current_canton];
            var axes = [];
            for (var key in canton_data[orderedColumns[currentFrame]]) {
                axes.push({
                    "axis": key,
                    "value": canton_data[orderedColumns[currentFrame]][key]
                });
            }
            RadarChart.draw(_container_id + " .chart-container", [
                {
                    "axes": axes
                }
            ]);

            $(_container_id + " .click-info").hide();
            $(_container_id + " .canton-info").show();
            $(_container_id + " .radar-canton-name").html(canton_name);
        }
    }

    var circleSize = function (d) {
        return Math.abs(d) * 0.0005 * circle_multiplier;
    }

    var createScale = function (columns) {
        var start = column_to_date(columns[0]),
            end = column_to_date(columns[columns.length - 1]);
        return d3.time.scale().domain([start, end]);
    }


    var setProbeContent = function (d) {
        var canton_data = canton_to_data_map[d];
        //var val = d[orderedColumns[currentFrame]];
        var html = "<strong>" + (d) + "</strong>";
        probe.html(html);
    }

    var getColor = function (valueIn, valuesIn) {

        var color = d3.scale.linear() // create a linear scale
            .domain([valuesIn[0], valuesIn[1]])  // input uses min and max values
            .range([0.01, 1]);   // output for opacity between .3 and 1 %

        return Math.abs((color(valueIn) - 0.5) * 2);  // return that number to the caller
    }

    var drawFrame = function (raw_column_string, tween) {
        var emoticons = map.selectAll('image')
            .attr("href", function (d) {
                if (d[orderedColumns[currentFrame]]) {
                    return svg_map[get_best_emotion(d[orderedColumns[currentFrame]])];
                }
            });


        var circle = map.selectAll("circle")
        /*.attr("class", function (d) {
         return d[raw_column_string] > 0 ? "gain" : "loss";
         })*/

        /*
         if (tween) {
         circle
         .transition()
         .ease("linear")
         .duration(frameLength)
         .attr("r", function (d) {
         if (canton_to_count_map) {
         var count = canton_to_count_map[d.canton][raw_column_string];
         return circleSize((count !== "No Data") ? count : 0);
         }
         return 0;
         });
         } else {
         circle.attr("r", function (d) {
         if (canton_to_count_map) {
         var count = canton_to_count_map[d.canton][raw_column_string];
         return circleSize((count !== "No Data") ? count : 0);
         }
         return 0;
         });
         }
         */
        d3.select(_container_id + " .date p.month").html(column_printer(raw_column_string));

        if (hoverData) {
            setProbeContent(hoverData);
        }

        map.selectAll('.canton').transition()  //select all the cantons and prepare for a transition to new values
            .duration(100)  // give it a smooth time period for the transition
            .attr('fill-opacity', function (d) {
                var canton_data = canton_to_data_map[d.id];
                if (canton_data[orderedColumns[currentFrame]]) {
                    return transparency_map[get_best_emotion(canton_data[orderedColumns[currentFrame]])];
                }
            })
            .attr('fill', function (d) {
                var canton_data = canton_to_data_map[d.id];
                if (canton_data[orderedColumns[currentFrame]]) {
                    return color_map[get_best_emotion(canton_data[orderedColumns[currentFrame]])];
                }
            });

        draw_radar();
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
            .html(moment(d).format('dddd') + " " + months[d.getMonth()] + " " + d.getFullYear())
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
                var new_value = Math.floor(value);
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
                //return d.getMonth() == 0 || i == 0 || (i == orderedColumns.length - 1) || d.getMonth() % 6 == 0;
                if (tick_count != -1)
                    return i == 0 || (i == orderedColumns.length - 1) || (i % Math.ceil(orderedColumns.length / tick_count) == 0);
                else
                    return true;
                //return true;
            }))
            .tickFormat(function (d) {
                // abbreviated year for most, full month/year for the ends
                //if (d.getMonth() == 0) return "'" + d.getFullYear().toString().substr(2);
                if (tick_count != -1)
                    return months[d.getMonth()] + " " + d.getFullYear();
                else {
                    //console.log(d)
                    return moment(d).format('dddd');
                }
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
                var stripped = mug.split("_").slice(0, -1).join("_")
                orderedColumns.push(stripped);
            }
        }

        orderedColumns = orderedColumns.filter(function (item, pos) {
            return orderedColumns.indexOf(item) == pos;
        })

        orderedColumns.sort(function (a, b) {
            return column_to_date(a) - column_to_date(b);
        });


        console.log(orderedColumns);

        // draw city points
        for (var i in data) {

            var canton_emotion_map = {};
            for (var k in orderedColumns) {
                var current_time_period_data = {};
                for (var t = 0; t < emotions.length; t++) {
                    var source_column_str = orderedColumns[k] + "_" + emotions[t];
                    current_time_period_data[emotions[t]] = (data[i][source_column_str] !== "No Data") ? parseInt(data[i][source_column_str]) : 0;
                }
                canton_emotion_map[orderedColumns[k]] = current_time_period_data;
            }

            canton_to_data_map[data[i].canton || data[i].Canton] = canton_emotion_map;

            var related_geometry = canton_id_to_geometry[data[i].canton || data[i].Canton];
            var projected = path.centroid(related_geometry);
            //var projected = projection([parseFloat(data[i].LON), parseFloat(data[i].LAT)])


            map.append("circle")
                .datum(canton_emotion_map)
                .attr("cx", projected[0])
                .attr("cy", projected[1])
                .attr("r", 1)
                .attr("vector-effect", "non-scaling-stroke")

            map.append("svg:image")
                .datum(canton_emotion_map)
                .attr("x", projected[0])
                .attr("y", projected[1])
                .attr("width", 30)
                .attr("height", 30)
                .attr('transform', "translate(-15,-15)")


        }

        console.log(canton_to_data_map);

        map.selectAll('.canton')
            .on("mousemove", function (d) {
                hoverData = d.id;
                setProbeContent(d.id);
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
                current_canton = d.id;
                draw_radar(d.properties.name);
            });

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
    var probe_selector = container_id + "-probe";

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

        cb(container_id, width, height, map, path, probe_selector, canton_id_to_geometry, svg, g, data_source); //initial loading
    });

    return {
        "container_id": container_id,
        "width": width,
        "height": height,
        "map": map,
        "path": path,
        "probe_selector": probe_selector,
        "canton_id_to_geometry": canton_id_to_geometry,
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


