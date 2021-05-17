/*  PseudosphereGeodesics - Visualising the geodesics of the pseudosphere
    Copyright (C) 2020 Tim J. Hutton

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

var canvas;
var ctx;
var range;
var vertical_vertical_view_angle;
var horizontal_vertical_view_angle;
var KleinAxesTransform;
var graphs;
var geodesics;
var isDragging;
var dragGeodesic;
var dragEnd;
var x_offset;

class Geodesic {
    constructor(start, end, color, hover_color) {
        this.ends = [start, end];
        this.color = color;
        this.end_colors = [color, color];
        this.hover_color = hover_color;
        this.end_sizes = [3, 3];
        this.default_end_sizes = [3, 3];
        this.hover_size = 5;
    }
}

class Graph {
    constructor(rect) {
        this.rect = rect;
    }
}

class UpperHalfPlaneGraph extends Graph {
    constructor(rect) {
        super(rect);
        this.top_text = "Upper half-plane";
        this.left_text = "";
        this.bottom_text ="";
    }
    update_transforms() {
        this.range_to_show = new Rect( new P(-7.5 + x_offset, 0), new P(15, 15));
        const flipY = p => new P(p.x, this.range_to_show.ymax - p.y + this.range_to_show.ymin); // flip the range in-place
        const flipYTransform = new Transform(flipY, flipY);
        this.transform = new ComposedTransform(flipYTransform, new LinearTransform2D(this.range_to_show, this.rect));
    }
    draw() {
        // draw the minor axes
        for(var y = this.range_to_show.ymin; y<=this.range_to_show.ymax; y+= y_step) {
            drawLine(getLinePoints(new P(this.range_to_show.xmin, y), new P(this.range_to_show.xmax, y), 2).map(this.transform.forwards), minor_axis_color);
        }
        for(var x = 0; x<=this.range_to_show.xmax; x+= x_step) {
            drawLine(getLinePoints(new P(x, this.range_to_show.ymin), new P(x, this.range_to_show.ymax), 2).map(this.transform.forwards), minor_axis_color);
        }
        for(var x = -x_step; x>=this.range_to_show.xmin; x-= x_step) {
            drawLine(getLinePoints(new P(x, this.range_to_show.ymin), new P(x, this.range_to_show.ymax), 2).map(this.transform.forwards), minor_axis_color);
        }
        // draw the x-axis
        const x_axis = getLinePoints(new P(this.range_to_show.xmin, 0), new P(this.range_to_show.xmax, 0), 2);
        drawLine(x_axis.map(this.transform.forwards), major_axis_color);
        // draw the unit line
        drawLine(getLinePoints(new P(this.range_to_show.xmin, 1), new P(this.range_to_show.xmax, 1), 2).map(this.transform.forwards), unit_line_color);
        // draw the seams where the pseudosphere wraps around itself
        var seams = [-5,-3,-1,1,3,5].map(x => getLinePoints(new P(x * Math.PI, this.range_to_show.ymin), new P(x * Math.PI, this.range_to_show.ymax), 2));
        seams.forEach(seam => drawLine(seam.map(this.transform.forwards), seam_color));
        // draw the geodesics
        ctx.lineWidth = '1.1';
        geodesics.forEach(geodesic => {
            var circle = findUpperHalfPlaneCircle(geodesic.ends[0], geodesic.ends[1]);
            var c = this.transform.forwards(circle.p);
            var a = this.transform.forwards(geodesic.ends[0]);
            var b = this.transform.forwards(geodesic.ends[1]);
            var r = dist(c, a);
            ctx.strokeStyle = geodesic.color;
            ctx.beginPath();
            var angle_a = Math.atan2(a.y - c.y, a.x - c.x);
            var angle_b = Math.atan2(b.y - c.y, b.x - c.x);
            ctx.arc(c.x, c.y, r, Math.min(angle_a, angle_b), Math.max(angle_a, angle_b) );
            ctx.stroke();
        });
        drawGeodesicsEndPoints(this.transform.forwards);
    }
}

class PoincareGraph extends Graph {
    constructor(rect, initial_range) {
        super(rect);
        this.initial_range = initial_range;
        this.top_text = "Poincaré disk model";
        this.left_text = "";
        this.bottom_text ="";
    }
    update_transforms() {
        this.range = new Rect(new P(this.initial_range.p.x + x_offset, this.initial_range.p.y), new P(this.initial_range.size.x, this.initial_range.size.y));
        const range_to_initial_range = new LinearTransform2D(this.range, this.initial_range);
        const circle_of_interest = new Circle(new P(0, -0.5), 0.52);
        this.circle_of_interest_to_rect = new LinearTransform2D(circle_of_interest.getRect(), this.rect);
        this.transform = new ComposedTransform(range_to_initial_range, inversionTransform, this.circle_of_interest_to_rect);
    }
    draw() {
        // draw the minor axes
        /*for(var y = this.range.ymin; y<=this.range.ymax; y+= y_step) {
            drawLine(getLinePoints(new P(this.range.xmin, y), new P(this.range.xmax, y), 500).map(this.transform.forwards), minor_axis_color);
        }
        for(var x = 0; x<=this.range.xmax; x+= x_step) {
            drawLine(getLinePoints(new P(x, this.range.ymin), new P(x, this.range.ymax), 200).map(this.transform.forwards), minor_axis_color);
        }
        for(var x = -x_step; x>=this.range.xmin; x-= x_step) {
            drawLine(getLinePoints(new P(x, this.range.ymin), new P(x, this.range.ymax), 200).map(this.transform.forwards), minor_axis_color);
        }*/
        // draw the unit circle ( = x-axis)
        var c = this.circle_of_interest_to_rect.forwards(unit_circle.p);
        var r = dist(c, this.circle_of_interest_to_rect.forwards(add(unit_circle.p, new P(1,0))));
        ctx.strokeStyle = major_axis_color;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, 2*Math.PI);
        ctx.stroke();
        /*
        // draw the unit line
        drawLine(getLinePoints(new P(this.range.xmin, 1), new P(this.range.xmax, 1), 500).map(this.transform.forwards), unit_line_color);
        // draw the seams where the pseudosphere wraps around itself
        var seams = [-9,-7,-5,-3,-1,1,3,5,7,9].map(x => getLinePoints(new P(x * Math.PI, this.range.ymin), new P(x * Math.PI, this.range.ymax), 700));
        seams.forEach(seam => drawLine(seam.map(this.transform.forwards), seam_color));
        // draw the geodesics
        ctx.lineWidth = '1.1';
        // TODO
        */
        drawGeodesicsEndPoints(this.transform.forwards);
    }
}

class PseudosphereGraph extends Graph {
    constructor(rect, camera) {
        super(rect);
        this.camera = camera;
        this.top_text = "Pseudosphere";
        this.left_text = "";
        this.bottom_text ="";
    }
    update_transforms() {
        const initial_range = new Rect( new P(-Math.PI, 1), new P(2 * Math.PI, 60));
        this.range_to_show = new Rect( new P(-Math.PI + x_offset, 1), new P(2 * Math.PI, 60));
        const range_to_initial_range = new LinearTransform2D(this.range_to_show, initial_range);
        const pseudosphereTransform = new Transform(pseudosphere, identityTransform); // TODO: would need camera ray intersection for the reverse
        this.camera.pp = this.rect.center;
        const cameraTransform = new Transform(p => this.camera.project(p), identityTransform);
        this.transform = new ComposedTransform(range_to_initial_range, invertXTransform, pseudosphereTransform, cameraTransform);
    }
    draw() {
        // draw the minor axes
        /*for(var y = this.range_to_show.ymin; y<=this.range_to_show.ymax; y+= y_step) {
            drawLine(getLinePoints(new P(this.range_to_show.xmin, y), new P(this.range_to_show.xmax, y), 500).map(this.transform.forwards), minor_axis_color);
        }
        for(var x = 0; x<=this.range_to_show.xmax; x+= x_step) {
            drawLine(getLinePoints(new P(x, this.range_to_show.ymin), new P(x, this.range_to_show.ymax), 500).map(this.transform.forwards), minor_axis_color);
        }
        for(var x = -x_step; x>=this.range_to_show.xmin; x-= x_step) {
            drawLine(getLinePoints(new P(x, this.range_to_show.ymin), new P(x, this.range_to_show.ymax), 500).map(this.transform.forwards), minor_axis_color);
        }
        // draw the unit line
        drawLine(getLinePoints(new P(this.range_to_show.xmin, 1), new P(this.range_to_show.xmax, 1), 500).map(this.transform.forwards), unit_line_color);
        // draw the seams where the pseudosphere wraps around itself (just one here, else the line looks too heavy)
        var seams = [-5,-3,-1,1,3,5].map(x => getLinePoints(new P(x * Math.PI, this.range_to_show.ymin), new P(x * Math.PI, this.range_to_show.ymax), 700));
        drawLine(seams[0].map(this.transform.forwards), seam_color);
        // draw the geodesics
        ctx.lineWidth = '1.1';
        // TODO
        */
        drawGeodesicsEndPoints(this.transform.forwards);
    }
}

class KleinGraph extends Graph {
    constructor(rect, initial_range) {
        super(rect);
        this.initial_range = initial_range;
        this.top_text = "Klein disk model";
        this.left_text = "";
        this.bottom_text ="";
    }
    update_transforms() {
        this.range = new Rect(new P(this.initial_range.p.x + x_offset, this.initial_range.p.y), new P(this.initial_range.size.x, this.initial_range.size.y));
        const range_to_initial_range = new LinearTransform2D(this.range, this.initial_range);
        const circle_of_interest = new Circle(new P(0, -0.5), 0.72);
        this.circle_of_interest_to_rect = new LinearTransform2D(circle_of_interest.getRect(), this.rect);
        const PoincareToKleinTransform = new Transform(p => unit_circle.poincareToKlein(p), p => unit_circle.kleinToPoincare(p));
        KleinAxesTransform = new ComposedTransform(range_to_initial_range, inversionTransform, PoincareToKleinTransform, this.circle_of_interest_to_rect);
        this.transform = KleinAxesTransform;
    }
    draw() {
        // draw the minor axes
        /*for(var y = this.range.ymin; y<=this.range.ymax; y+= y_step) {
            drawLine(getLinePoints(new P(this.range.xmin, y), new P(this.range.xmax, y), 500).map(KleinAxesTransform.forwards), minor_axis_color);
        }*/
        for(var x = 0; x<=this.range.xmax; x+= x_step) {
            drawLine(getLinePoints(new P(x, this.range.ymin), new P(x, this.range.ymax), 2).map(KleinAxesTransform.forwards), minor_axis_color);
        }
        for(var x = -x_step; x>=this.range.xmin; x-= x_step) {
            drawLine(getLinePoints(new P(x, this.range.ymin), new P(x, this.range.ymax), 2).map(KleinAxesTransform.forwards), minor_axis_color);
        }
        // draw the unit circle ( = x-axis)
        /*const circle_pts = getEllipsePoints(unit_circle.p, new P(unit_circle.r, 0), new P(0, unit_circle.r)).map(this.circle_of_interest_to_rect.forwards);
        drawLine(circle_pts, major_axis_color);
        // draw the unit line
        drawLine(getLinePoints(new P(this.range.xmin, 1), new P(this.range.xmax, 1), 500).map(KleinAxesTransform.forwards), unit_line_color);
        // draw the seams where the pseudosphere wraps around itself
        var seams = [-5,-3,-1,1,3,5].map(x => getLinePoints(new P(x * Math.PI, this.range.ymin), new P(x * Math.PI, this.range.ymax), 2));
        seams.forEach(seam => drawLine(seam.map(KleinAxesTransform.forwards), seam_color));
        // draw the geodesics
        ctx.lineWidth = '1.1';
        //TODO
        */
        drawGeodesicsEndPoints(KleinAxesTransform.forwards);
    }
}

function resetMarkers() {
    geodesics.forEach( geodesic => {
        for(var iEnd = 0; iEnd < 2; iEnd++) {
            geodesic.end_sizes[iEnd] = geodesic.default_end_sizes[iEnd];
            geodesic.end_colors[iEnd] = geodesic.color;
        }
    });
}

function findClosestEnd(mousePos, graph, radius) {
    var withinRadius = false;
    var whichGeodesic;
    var whichEnd;
    var d_min = Number.MAX_VALUE;
    geodesics.forEach( geodesic => {
        for(var iEnd = 0; iEnd < 2; iEnd++) {
            var d = dist(mousePos, graph.transform.forwards(geodesic.ends[iEnd]));
            if( d < radius && d < d_min) {
                d_min = d;
                withinRadius = true;
                whichGeodesic = geodesic;
                whichEnd = iEnd;
            }
        }
    });
    return [withinRadius, whichGeodesic, whichEnd];
}

function onMouseMove( evt ) {
    var mousePos = getMousePos(evt);
    var targetGraph = graphs.find( graph => graph.rect.pointInRect(mousePos) );
    if(targetGraph) {
        if(isDragging) {
            // move the handle being dragged
            dragGeodesic.ends[dragEnd] = targetGraph.transform.backwards(mousePos);
        }
        else {
            // indicate which marker is being hovered over
            resetMarkers();
            const [isHovering, hoveredGeodesic, hoveredEnd] = findClosestEnd(mousePos, targetGraph, 20);
            if(isHovering) {
                hoveredGeodesic.end_sizes[hoveredEnd] = hoveredGeodesic.hover_size;
                hoveredGeodesic.end_colors[hoveredEnd] = hoveredGeodesic.hover_color;
            }
        }
        draw();
    }
}

function onMouseDown( evt ) {
    var mousePos = getMousePos(evt);
    var targetGraph = graphs.find( graph => graph.rect.pointInRect(mousePos) );
    if(targetGraph) {
        [isDragging, dragGeodesic, dragEnd] = findClosestEnd(mousePos, targetGraph, 20);
        if(isDragging) {
            dragGeodesic.end_sizes[dragEnd] = dragGeodesic.hover_size;
            dragGeodesic.end_colors[dragEnd] = dragGeodesic.hover_color;
        }
    }
}

function onMouseUp( evt ) {
    isDragging = false;
    draw();
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    isDragging = false;

    var verticalViewAngleSlider = document.getElementById("verticalViewAngleSlider");
    vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
    horizontal_view_angle = Math.PI;
    var camera = new Camera(new P(10 * Math.cos(horizontal_view_angle), 10 * Math.sin(horizontal_view_angle),
                                  vertical_view_angle), new P(0, 0, 1), new P(0, 0, 1), 1300, new P(0,0));

    verticalViewAngleSlider.oninput = function() {
        vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
        camera.p.z = vertical_view_angle;
        draw();
    }

    // TODO: rename slider
    x_offset = -8 * Math.PI * (horizontalViewAngleSlider.value / 100.0 - 0.5);
    horizontalViewAngleSlider.oninput = function() {
        //horizontal_view_angle = 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
        x_offset = -8 * Math.PI * (horizontalViewAngleSlider.value / 100.0 - 0.5);
        //camera.p.x = 10 * Math.cos(horizontal_view_angle);
        //camera.p.y = 10 * Math.sin(horizontal_view_angle);
        draw();
    }

    random_colors = [ "rgb(28,63,163)", "rgb(47,151,5)", "rgb(35,135,196)", "rgb(13,178,159)",
                      "rgb(88,21,47)",  "rgb(98,11,77)", "rgb(159,160,25)", "rgb(98,103,144)",
                      "rgb(157,38,199)", "rgb(171,37,199)" ]; // (guaranteed to be random)

    var initial_range = new Rect( new P(-30, 0), new P(60, 40));

    x_step = Math.PI / 6;
    y_step = 0.5;

    const inversion_circle = new Circle(new P(0, -1), Math.sqrt(2)); // transforms the upper half-plane to the unit circle
    const invert = p => inversion_circle.invert(p);
    inversionTransform = new Transform( invert, invert );
    unit_circle = new Circle(new P(0, 0), 1);
    const invertX = p => new P(-p.x, p.y);
    invertXTransform = new Transform(invertX, invertX);
    major_axis_color = 'rgb(50,50,50)';
    minor_axis_color = 'rgb(210,210,210)';
    unit_line_color = 'rgb(150,50,50)';
    seam_color = 'rgb(200,130,50)';

    // construct the graphs
    var n_graphs = 4;
    var margin = 40;
    var size = Math.min(canvas.height-margin*2, (canvas.width-margin*(n_graphs+1)) / n_graphs);
    var rects = [0,1,2,3].map(i => new Rect( new P(margin+(margin+size)*i,50), new P(size,size)));
    graphs = [new UpperHalfPlaneGraph(rects[0]), new PoincareGraph(rects[1], initial_range),
        new PseudosphereGraph(rects[2], camera), new KleinGraph(rects[3], initial_range)];

    // construct geodesics by defining start and end points
    const pts = [[new P(-6, 1), new P(4, 1)],
                 [new P(-1.5, 1), new P(2, 1)],
                 [new P(-14, 1), new P(14, 1)]];
    geodesics = [];
    pts.forEach((pair, index) => {
        geodesics.push(new Geodesic(pair[0], pair[1], random_colors[index % random_colors.length], random_colors[index % random_colors.length]));
        // TODO: darken hover color
    });

    // construct another geodesic, by actually tracing the geodesic on the 3D surface of the pseudosphere
    // but this is just for debugging - there's an easier way of making geodesics for the pseudosphere, see below
    if(false) { // (set to true if you want to see it - it will be drawn in purple half on top of another geodesic)
        const x = -1;
        const h = 5.1;
        const a = new P(x, h);
        const b = new P(x+0.01, h);
        test_geodesic = get_pseudosphere_geodesic_points(a, b, 2000);
    }

    draw();

    canvas.addEventListener( 'mousemove', onMouseMove, false );
    canvas.addEventListener( 'mousedown', onMouseDown, false );
    canvas.addEventListener( 'mouseup',   onMouseUp,   false );
}

function drawGeodesicsEndPoints(transform) {
    geodesics.forEach(geodesic => {
        for(var iEnd = 0; iEnd < 2; iEnd++) {
            fillCircle(transform(geodesic.ends[iEnd]), geodesic.end_sizes[iEnd], geodesic.end_colors[iEnd]);
        }
    });
}

function random_color() {
    return 'rgb('+(Math.random()*200).toFixed(0)+','+(Math.random()*200).toFixed(0)+','+(Math.random()*200).toFixed(0)+')';
}

function draw() {
    graphs.forEach(graph => {
        graph.update_transforms();
    });

    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    // draw things that the graphs have in common
    graphs.forEach(graph => {
        ctx.save(); // save the original clip for now

        // fill background with white
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(graph.rect.xmin-1, graph.rect.ymin-1, graph.rect.size.x+2, graph.rect.size.y+2);
        ctx.fill();
        ctx.clip(); // clip to this rect until restored

        // draw things that are particular to this graph
        graph.draw();

        // draw the test geodesic, if chosen
        if(typeof test_geodesic != 'undefined') {
            ctx.lineWidth = '2';
            drawLine(test_geodesic.map(graph.transform.forwards), 'rgb(200,120,200)');
        }

        ctx.restore(); // restore the original clip

        // show the graph labels
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(graph.bottom_text, graph.rect.center.x, graph.rect.ymax + 15);
        ctx.fillText(graph.top_text,    graph.rect.center.x, graph.rect.ymin - 15);
        ctx.save();
        ctx.translate(graph.rect.xmin - 15, graph.rect.center.y);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign = "center";
        ctx.fillText(graph.left_text, 0, 0);
        ctx.restore();
    });
}

window.onload = init;
