#version 140

in highp vec2 uv;
out vec4 out_fragColor;

uniform fragment_uniforms
{
    highp vec4 segment;
    highp vec4 brush;
};

void main()
{
    vec2 point = uv * brush.xy;
    vec2 span = segment.zw - segment.xy;
    float along = clamp(dot(point - segment.xy, span) / max(dot(span, span), 0.0001), 0.0, 1.0);
    float distance_from_tip = length(point - (segment.xy + along * span));
    float alpha = 1.0 - smoothstep(0.65 * brush.z, brush.z, distance_from_tip);
    out_fragColor = vec4(alpha);
}
