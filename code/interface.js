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

class Geodesic {
    constructor(peak, color) {
        this.peak = peak;
        this.color = color;
    }
}

class Graph {
    constructor(screen_rect, transform, top_text, left_text, bottom_text, drawing = () => {}) {
        this.screen_rect = screen_rect;
        this.transform = transform;
        this.top_text = top_text;
        this.left_text = left_text;
        this.bottom_text = bottom_text;
        this.drawing = drawing;
    }
}

function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    range = new Rect( new P(-20, 0), new P(40, 40));

    var verticalViewAngleSlider = document.getElementById("verticalViewAngleSlider");
    vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
    verticalViewAngleSlider.oninput = function() {
        vertical_view_angle = 20 - 40 * verticalViewAngleSlider.value / 100.0;
        draw();
    }

    var horizontalViewAngleSlider = document.getElementById("horizontalViewAngleSlider");
    horizontal_view_angle = 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
    horizontalViewAngleSlider.oninput = function() {
        horizontal_view_angle = 2 * Math.PI * horizontalViewAngleSlider.value / 100.0;
        draw();
    }

    random_colors = [ "rgb(28,63,163)", "rgb(47,151,5)", "rgb(35,135,196)", "rgb(13,178,159)", "rgb(88,21,47)", "rgb(98,11,77)", "rgb(159,160,25)", "rgb(98,103,144)", "rgb(157,38,199)", "rgb(171,37,199)" ]; // (guaranteed to be random)

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
}

function random_color() {
    return 'rgb('+(Math.random()*200).toFixed(0)+','+(Math.random()*200).toFixed(0)+','+(Math.random()*200).toFixed(0)+')';
}

function draw() {
    // fill canvas with light gray
    ctx.fillStyle = 'rgb(240,240,240)';
    ctx.beginPath();
    ctx.rect(0,0,canvas.width, canvas.height);
    ctx.fill();

    var unit_line = getLinePoints(new P(range.xmin, 1), new P(range.xmax, 1), 500);
    var y_axis = getLinePoints(new P(0, range.ymin), new P(0, range.ymax), 700);

    var y_step = 0.5;
    var x_step = 0.5;

    var n_graphs = 4;
    var margin = 40;
    var size = Math.min(canvas.height-margin*2, (canvas.width-margin*(n_graphs+1)) / n_graphs);
    var rect1 = new Rect( new P(margin+(margin+size)*0,50), new P(size,size));
    var rect2 = new Rect( new P(margin+(margin+size)*1,50), new P(size,size));
    var rect3 = new Rect( new P(margin+(margin+size)*2,50), new P(size,size));
    var rect4 = new Rect( new P(margin+(margin+size)*3,50), new P(size,size));

    var graphs = []

    const inversion_circle = new Circle(new P(0, -1), Math.sqrt(2)); // transforms the upper half-plane to the unit circle
    const invert = p => inversion_circle.invert(p);
    const inversionTransform = new Transform( invert, invert );
    const unit_circle = new Circle(new P(0, 0), 1);
    const invertX = p => new P(-p.x, p.y);
    const invertXTransform = new Transform(invertX, invertX);
    const major_axis_color = 'rgb(50,50,50)';
    const minor_axis_color = 'rgb(210,210,210)';
    const unit_line_color = 'rgb(150,50,50)';

    // define the upper half-plane graph
    {
        const range_to_show = new Rect( new P(-7.5, 0), new P(15, 15));
        const flipY = p => new P(p.x, range_to_show.ymax - p.y + range_to_show.ymin); // flip the range in-place
        const flipYTransform = new Transform(flipY, flipY);
        const upperHalfPlaneAxesTransform = new ComposedTransform(flipYTransform, new LinearTransform2D(range_to_show, rect1));
        const drawing = () => {
            // draw the minor axes
            for(var y = range_to_show.ymin; y<=range_to_show.ymax; y+= y_step) {
                drawLine(getLinePoints(new P(range_to_show.xmin, y), new P(range_to_show.xmax, y), 200).map(upperHalfPlaneAxesTransform.forwards), minor_axis_color);
            }
            for(var x = x_step; x<=range_to_show.xmax; x+= x_step) {
                drawLine(getLinePoints(new P(x, range_to_show.ymin), new P(x, range_to_show.ymax), 200).map(upperHalfPlaneAxesTransform.forwards), minor_axis_color);
            }
            for(var x = -x_step; x>=range_to_show.xmin; x-= x_step) {
                drawLine(getLinePoints(new P(x, range_to_show.ymin), new P(x, range_to_show.ymax), 200).map(upperHalfPlaneAxesTransform.forwards), minor_axis_color);
            }
            // draw the x-axis
            const x_axis = getLinePoints(new P(range_to_show.xmin, 0), new P(range_to_show.xmax, 0), 200);
            drawLine(x_axis.map(upperHalfPlaneAxesTransform.forwards), major_axis_color);
        };
        const upperHalfPlaneAxes = new Graph(rect1, upperHalfPlaneAxesTransform, "Upper half-plane", "", "", drawing);
        graphs.push(upperHalfPlaneAxes);
    }

    // define the Poincare disk graph
    {
        const circle_of_interest = new Circle(new P(0, -0.5), 0.6);
        const circle_of_interest_to_rect2 = new LinearTransform2D(circle_of_interest.getRect(), rect2);
        const PoincareAxesTransform = new ComposedTransform(inversionTransform, circle_of_interest_to_rect2);
        const drawing = () => {
            // draw the minor axes
            for(var y = range.ymin; y<=range.ymax; y+= y_step) {
                drawLine(getLinePoints(new P(range.xmin, y), new P(range.xmax, y), 200).map(PoincareAxesTransform.forwards), minor_axis_color);
            }
            for(var x = x_step; x<=range.xmax; x+= x_step) {
                drawLine(getLinePoints(new P(x, range.ymin), new P(x, range.ymax), 200).map(PoincareAxesTransform.forwards), minor_axis_color);
            }
            for(var x = -x_step; x>=range.xmin; x-= x_step) {
                drawLine(getLinePoints(new P(x, range.ymin), new P(x, range.ymax), 200).map(PoincareAxesTransform.forwards), minor_axis_color);
            }
            // draw the unit circle ( = x-axis)
            const circle_pts = getEllipsePoints(unit_circle.p, new P(unit_circle.r, 0), new P(0, unit_circle.r)).map(circle_of_interest_to_rect2.forwards);
            drawLine(circle_pts, major_axis_color);
        };
        const PoincareAxes = new Graph(rect2, PoincareAxesTransform, "Poincaré disk model", "", "", drawing);
        graphs.push(PoincareAxes);
    }

    // define the 3D pseudosphere graph
    {
        const range_to_show = new Rect( new P(-Math.PI, 1), new P(2 * Math.PI, 60));
        const pseudosphereTransform = new Transform(pseudosphere, identityTransform); // TODO: would need camera ray intersection for the reverse
        const camera = new Camera(new P(10 * Math.cos(horizontal_view_angle), 10 * Math.sin(horizontal_view_angle), vertical_view_angle),
                                  new P(0, 0, 0.7), new P(0, 0, 1), 1500, rect3.center);
        const cameraTransform = new Transform(p => camera.project(p), identityTransform);
        const pseudosphereAxesTransform = new ComposedTransform(invertXTransform, pseudosphereTransform, cameraTransform);
        const drawing = () => {
            // draw the minor axes
            for(var y = range_to_show.ymin; y<=range_to_show.ymax; y+= y_step) {
                drawLine(getLinePoints(new P(range_to_show.xmin, y), new P(range_to_show.xmax, y), 500).map(pseudosphereAxesTransform.forwards), minor_axis_color);
            }
            for(var x = x_step; x<=range_to_show.xmax; x+= x_step) {
                drawLine(getLinePoints(new P(x, range_to_show.ymin), new P(x, range_to_show.ymax), 500).map(pseudosphereAxesTransform.forwards), minor_axis_color);
            }
            for(var x = -x_step; x>=range_to_show.xmin; x-= x_step) {
                drawLine(getLinePoints(new P(x, range_to_show.ymin), new P(x, range_to_show.ymax), 500).map(pseudosphereAxesTransform.forwards), minor_axis_color);
            }
        };
        const pseudosphereAxes = new Graph(rect3, pseudosphereAxesTransform, "Pseudosphere", "", "", drawing);
        graphs.push(pseudosphereAxes);
    }

    // define the Klein pseudosphere graph
    {
        const circle_of_interest = new Circle(new P(0, -0.5), 0.8);
        const circle_of_interest_to_rect4 = new LinearTransform2D(circle_of_interest.getRect(), rect4);
        const PoincareToKleinTransform = new Transform(p => unit_circle.poincareToKlein(p), p => unit_circle.kleinToPoincare(p));
        var KleinAxesTransform = new ComposedTransform(inversionTransform, PoincareToKleinTransform, circle_of_interest_to_rect4);
        const drawing = () => {
            // draw the minor axes
            for(var y = range.ymin; y<=range.ymax; y+= y_step) {
                drawLine(getLinePoints(new P(range.xmin, y), new P(range.xmax, y), 200).map(KleinAxesTransform.forwards), minor_axis_color);
            }
            for(var x = x_step; x<=range.xmax; x+= x_step) {
                drawLine(getLinePoints(new P(x, range.ymin), new P(x, range.ymax), 200).map(KleinAxesTransform.forwards), minor_axis_color);
            }
            for(var x = -x_step; x>=range.xmin; x-= x_step) {
                drawLine(getLinePoints(new P(x, range.ymin), new P(x, range.ymax), 200).map(KleinAxesTransform.forwards), minor_axis_color);
            }
            // draw the unit circle ( = x-axis)
            const circle_pts = getEllipsePoints(unit_circle.p, new P(unit_circle.r, 0), new P(0, unit_circle.r)).map(circle_of_interest_to_rect4.forwards);
            drawLine(circle_pts, major_axis_color);
        };
        const KleinAxes = new Graph(rect4, KleinAxesTransform, "Klein disk model", "", "", drawing);
        graphs.push(KleinAxes);

        // also construct geodesics by plonking down straight lines in the Klein disk model
        const pts = [[new P(-6, 1), new P(4, 1)], [new P(-1.5, 1), new P(2, 1)]];
        const klein_pts = pts.map(pair => pair.map(KleinAxesTransform.forwards));
        var klein_lines = klein_pts.map(pair => getLinePoints(pair[0], pair[1], 3000).map(KleinAxesTransform.backwards));
    }

    // draw things that the graphs have in common
    graphs.forEach(graph => {
        ctx.save(); // save the original clip for now

        // fill background with white
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        ctx.rect(graph.screen_rect.xmin-1, graph.screen_rect.ymin-1, graph.screen_rect.size.x+2, graph.screen_rect.size.y+2);
        ctx.fill();
        ctx.clip(); // clip to this rect until restored

        // draw things that are particular to this graph
        graph.drawing();

        // draw axes
        drawLine(unit_line.map(graph.transform.forwards), unit_line_color);
        drawLine(y_axis.map(graph.transform.forwards), major_axis_color);

        // draw one geodesic
        ctx.lineWidth = '2';
        klein_lines.forEach((line, index) => drawLine(line.map(graph.transform.forwards), random_colors[index]));

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
        ctx.fillText(graph.bottom_text, graph.screen_rect.center.x, graph.screen_rect.ymax + 15);
        ctx.fillText(graph.top_text,    graph.screen_rect.center.x, graph.screen_rect.ymin - 15);
        ctx.save();
        ctx.translate(graph.screen_rect.xmin - 15, graph.screen_rect.center.y);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign = "center";
        ctx.fillText(graph.left_text, 0, 0);
        ctx.restore();
    });
}

window.onload = init;
