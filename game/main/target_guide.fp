#version 140

in mediump vec2 var_texcoord0;
in mediump vec4 var_color;
out vec4 out_fragColor;

uniform fragment_uniforms
{
    // Radius, dash count (zero for the working tip), and sparkle radius.
    highp vec4 guide;
};

void main()
{
    vec2 point = (var_texcoord0 - 0.5) * (2.0 * guide.x + 6.0);
    float edge = abs(length(point) - guide.x);
    float aa = 0.5 * length(fwidth(point));
    float ring = 1.0 - smoothstep(0.0, 2.0 * aa, edge - 0.85 + aa);
    if (guide.y > 0.0)
    {
        // A whole number of dashes closes the ring cleanly at the angular seam.
        float phase = atan(point.y, point.x + 0.00001) * guide.y / 6.2831853;
        float dash_edge = (abs(fract(phase) - 0.5) - 0.25) * (6.2831853 * guide.x / guide.y);
        ring *= 1.0 - smoothstep(-aa, aa, dash_edge);
    }

    float sparkle = 0.0;
    if (guide.z > 0.0)
    {
        vec2 axes = abs(point);
        float shape = axes.x + axes.y + 2.0 * sqrt(axes.x * axes.y);
        sparkle = 1.0 - smoothstep(guide.z - aa, guide.z + aa, shape);
    }
    out_fragColor = var_color * max(ring, sparkle);
}
