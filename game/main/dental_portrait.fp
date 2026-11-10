#version 140
in mediump vec2 var_texcoord0;
in mediump vec4 var_color;
out vec4 out_fragColor;
uniform lowp sampler2D texture_sampler;
uniform fragment_uniforms {
    highp vec4 from_x;
    highp vec4 from_y;
    highp vec4 to_x;
    highp vec4 to_y;
    highp vec4 background_x;
    highp vec4 background_y;
    highp vec4 target0;
    highp vec4 target1;
    highp vec4 target2;
    highp vec4 target3;
    highp vec4 target4;
    highp vec4 target5;
    highp vec4 target6;
    highp vec4 target7;
    highp vec4 target8;
    highp vec4 target9;
    highp vec4 target10;
    highp vec4 target11;
    highp vec4 target12;
    highp vec4 target13;
    highp vec4 target14;
    highp vec4 target15;
};
vec2 atlas_uv(vec2 uv, vec4 x, vec4 y) { return x.xy + uv.x*x.zw + uv.y*y.xy; }
void accumulate(vec2 point, vec4 target, inout float total, inout float revealed) {
    vec2 d=point-target.xy;
    float ratio=900.0/(dot(d,d)+900.0);
    float weight=ratio*ratio*ratio;
    total+=weight; revealed+=weight*target.z;
}
vec4 finish_enamel(vec4 color, float polished) {
    // Lift neutral enamel highlights while leaving red gums and dark gaps intact.
    float enamel=smoothstep(.48,.78,min(color.r,min(color.g,color.b)))
        *(1.0-smoothstep(.09,.23,max(color.r,max(color.g,color.b))-min(color.r,min(color.g,color.b))));
    color.rgb=mix(color.rgb,vec3(.99,.995,1.0),polished*enamel*.48);
    return color;
}
void main() {
    vec2 q=var_texcoord0-from_x.xy;
    float determinant=from_x.z*from_y.y-from_x.w*from_y.x;
    vec2 uv=vec2(q.x*from_y.y-q.y*from_y.x,from_x.z*q.y-from_x.w*q.x)/determinant;
    vec2 point=vec2(uv.x,1.0-uv.y)*vec2(640.0,960.0);
    float mouth=1.0-smoothstep(0.90,1.0,length((point-vec2(320.0,440.0))/vec2(324.0,164.0)));
    vec4 background=texture(texture_sampler,atlas_uv(uv,background_x,background_y));
    if (mouth<=0.0) { out_fragColor=background*var_color; return; }
    vec4 color=finish_enamel(texture(texture_sampler,var_texcoord0),from_y.z);
    if (target0.w>0.5) {
        float total=0.0, revealed=0.0;
        accumulate(point,target0,total,revealed);
        accumulate(point,target1,total,revealed);
        accumulate(point,target2,total,revealed);
        accumulate(point,target3,total,revealed);
        accumulate(point,target4,total,revealed);
        accumulate(point,target5,total,revealed);
        accumulate(point,target6,total,revealed);
        accumulate(point,target7,total,revealed);
        accumulate(point,target8,total,revealed);
        accumulate(point,target9,total,revealed);
        accumulate(point,target10,total,revealed);
        accumulate(point,target11,total,revealed);
        accumulate(point,target12,total,revealed);
        accumulate(point,target13,total,revealed);
        accumulate(point,target14,total,revealed);
        accumulate(point,target15,total,revealed);
        float coverage=clamp(revealed/max(total,0.000000000001),0.0,1.0);
        color=mix(color,finish_enamel(texture(texture_sampler,atlas_uv(uv,to_x,to_y)),to_y.z),coverage);
    }
    // Apply the shared facial feather once to the final color.
    out_fragColor=mix(background,color,mouth)*var_color;
}
