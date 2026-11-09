#version 140

in highp vec2 uv;
out vec4 out_fragColor;

uniform lowp sampler2D artwork;
uniform lowp sampler2D reveal;
uniform fragment_uniforms
{
    highp vec4 uv_basis_x;
    highp vec4 uv_basis_y;
    mediump vec4 coverage;
};

void main()
{
    vec2 art_uv = uv_basis_x.xy + uv.x * uv_basis_x.zw + uv.y * uv_basis_y.xy;
    float mask = 1.0;
    if (coverage.x < 1.0)
    {
        mask = mix(texture(reveal, uv).a, 1.0, coverage.x);
    }
    // Atlas color already carries the artwork's feathered, premultiplied alpha.
    out_fragColor = texture(artwork, art_uv) * mask;
}
