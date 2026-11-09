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
    mediump vec4 color_scale;
};

void main()
{
    vec2 art_uv = uv_basis_x.xy + uv.x * uv_basis_x.zw + uv.y * uv_basis_y.xy;
    float mask = 1.0;
    if (coverage.x < 1.0)
    {
        mask = mix(texture(reveal, uv).a, 1.0, coverage.x);
    }
    // Ease the added color into the authored feather while keeping opacity intact.
    vec4 color = texture(artwork, art_uv);
    vec2 cheek = (uv - vec2(0.5, 0.435)) * vec2(1.9, 2.45);
    float falloff = max(1.0 - dot(cheek, cheek), 0.0);
    float strength = smoothstep(0.0, 1.0, color.a) * mix(1.0, falloff * falloff, color_scale.w);
    color.rgb *= mix(vec3(1.0), color_scale.rgb, strength);
    out_fragColor = color * mask;
}
