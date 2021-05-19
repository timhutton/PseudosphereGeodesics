/*  PseudosphereGeodesics - Visualising geodesics in general relativity
    Copyright (C) 2021 Tim J. Hutton

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

function upper_half_plane_to_pseudosphere_input(p) {
    return new P(p.x, Math.acosh(p.y));
}

function pseudosphere_input_to_upper_half_plane(p) {
    return new P(p.x, Math.cosh(p.y));
}

function pseudosphere_radius_from_u(u) {
    return Math.sech(u);
}

function pseudosphere_z_from_u(u) {
    return u - Math.tanh(u);
}

function pseudosphere_u_from_z(z) {
    return bisection_search(z, 0, 1e6, 1e-6, 200, pseudosphere_z_from_u);
}

function pseudosphere(p) {
    p = upper_half_plane_to_pseudosphere_input(p);
    const u = p.y;
    const v = p.x;
    const radius = pseudosphere_radius_from_u(u);
    const z = pseudosphere_z_from_u(u);
    const theta = v;
    return new P(radius * Math.cos(theta), radius * Math.sin(theta), z);
}

function pseudosphere_surface_normal(p) {
    p = upper_half_plane_to_pseudosphere_input(p);
    const u = p.y;
    const v = p.x;
    const theta = v;
    const dr_du = - Math.tanh(u) * Math.sech(u);
    const dz_du = 1 - Math.pow(Math.sech(u), 2);
    const dz_dr = dz_du / dr_du;
    const normal = normalize(new P(-dz_dr, 0, 1)); // in the XZ plane
    return rotateXY(normal, theta);
}

function get_pseudosphere_geodesic_points(a, b, max_points) {
    // Walk along the embedding following the geodesic until we hit z=0 or have enough points.
    // N.B. This function is only for debugging, there are easier ways of obtaining a geodesic.
    const pts = [a, b];
    var surface_a = pseudosphere(a);
    var surface_b = pseudosphere(b);
    for(var iPt = 0; iPt < max_points; iPt++) {
        const n = pseudosphere_surface_normal(b);
        const incoming_segment = sub(surface_b, surface_a);
        const norm_vec = normalize(cross(incoming_segment, n));
        // we rotate surface_a around norm_vec through surface_b, at an angle theta somewhere between 90 degrees and 270 degrees
        // such that the new point lies on the funnel
        const theta = bisection_search(0, Math.PI / 2, 3 * Math.PI / 2, 1e-6, 200, theta => {
            const surface_c = rotateAroundPointAndVector(surface_a, surface_b, norm_vec, theta);
            // decide if this point is inside or outside the funnel
            const actual_radius = len(new P(surface_c.x, surface_c.y));
            const z = Math.max(0, surface_c.z); // not sure what to do if surface_c.z < 0 here
            const u = pseudosphere_u_from_z(z);
            const expected_radius = pseudosphere_radius_from_u(u);
            return expected_radius - actual_radius; // signed distance to the funnel surface
        });
        const surface_c = rotateAroundPointAndVector(surface_a, surface_b, norm_vec, theta);
        if( surface_c.z < 0 ) {
            // have hit the edge of the embedding
            break;
        }
        // convert to spacetime coordinates
        const z = surface_c.z;
        const u = pseudosphere_u_from_z(z);
        const delta_v = signedAngleBetweenTwoPointsXY(surface_b, surface_c);
        const c = pseudosphere_input_to_upper_half_plane(new P(b.x + delta_v, u));
        pts.push(c);
        surface_a = surface_b;
        surface_b = surface_c;
        b = c;
    }
    return pts;
}
