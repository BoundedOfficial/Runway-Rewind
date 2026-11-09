#version 140

in highp vec2 uv;
out vec4 out_fragColor;

uniform lowp sampler2D portrait;
uniform fragment_uniforms
{
    // Authored center in portrait pixels, pressure, and progress through the lift.
    highp vec4 extraction;
    // Portrait dimensions, patch size, and signed bead travel in pixels.
    highp vec4 dimensions;
};

void main()
{
    vec2 point = (uv - 0.5) * dimensions.z;
    if (extraction.z > 0.0)
    {
        // Squeeze the original blemish and feather into the surrounding skin.
        float squeeze = extraction.z * (1.0 - smoothstep(3.0, 19.0, length(point)));
        vec2 sample_point = extraction.xy + point * (1.0 + squeeze * vec2(-0.35, 1.0));
        out_fragColor = texture(portrait, sample_point / dimensions.xy);
        return;
    }

    float lift = extraction.w;
    float travel = 1.0 - pow(1.0 - lift, 5.0);
    vec2 offset = point - vec2(dimensions.w * travel, 10.0 * sin(travel * 2.0));
    offset.x *= sign(dimensions.w);
    // The bead elongates as it breaks free, then rounds and fades as the tool lifts.
    float stretch = sin(3.14159 * smoothstep(0.0, 0.52, lift));
    float size = mix(0.46, 1.0, smoothstep(0.0, 0.18, lift));
    vec2 radii = vec2(7.7 + 2.7 * stretch, 5.7 - 1.4 * stretch) * size;
    vec2 body = vec2(0.94 * offset.x + 0.34 * offset.y, -0.34 * offset.x + 0.94 * offset.y) / radii;
    float edge = length(body);
    float aa = max(fwidth(edge), 0.06);
    float alpha = (1.0 - smoothstep(1.0 - aa, 1.0, edge)) * (1.0 - smoothstep(0.55, 0.97, lift));
    float light = clamp(0.74 + 0.55 * body.y - 0.28 * body.x, 0.0, 1.0);
    vec3 color = mix(vec3(0.79, 0.60, 0.42), vec3(1.0, 0.98, 0.86), light);
    out_fragColor = vec4(color * alpha, alpha);
}
