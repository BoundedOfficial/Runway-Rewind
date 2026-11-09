#version 140

in highp vec2 uv;
out vec4 out_fragColor;

uniform lowp sampler2D portrait;
uniform lowp sampler2D splat;
uniform fragment_uniforms
{
    // Authored center in portrait pixels, pressure, and progress through the lift.
    highp vec4 extraction;
    // Portrait dimensions, patch size, and reserved component.
    highp vec4 dimensions;
    highp vec4 uv_basis_x;
    highp vec4 uv_basis_y;
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

    vec2 art_uv = uv_basis_x.xy + uv.x * uv_basis_x.zw + uv.y * uv_basis_y.xy;
    // Atlas textures are premultiplied; fade both color and alpha together.
    out_fragColor = texture(splat, art_uv) * (1.0 - smoothstep(0.72, 1.0, extraction.w));
}
