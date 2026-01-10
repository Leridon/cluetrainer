#version 300 es
precision mediump float;

in vec3 aVertexPosition;
in vec4 aVertexColor;
in vec2 aTexSubUV;
in vec3 aSubTexInfo;
in float aVertexFlags;
in float aBoneId;


uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform float uEnableTextures;
uniform sampler2D uBoneSampler;
uniform ivec3 uBoneAnim;

out lowp vec4 vColor;
out highp vec2 vTexSubUV;
out highp vec3 vSubTexInfo;
out float vVertexFlags;

void main(void) {

	/*
	int wraps=int(floor(aBoneId/256.0));
	int boneindex=int(aBoneId)-wraps*256;
	mat4 bonematrix=uBones[boneindex];
	gl_Position = uViewMatrix * uModelMatrix*bonematrix * vec4(aVertexPosition, 1.0);
	/*/
	//*
	int boneid=int(aBoneId);
	mat4 bonematrix=mat4(
		mix(texelFetch(uBoneSampler,ivec2(0,boneid+uBoneAnim.s),0),texelFetch(uBoneSampler,ivec2(0,boneid+uBoneAnim.t),0),float(uBoneAnim.p)/512.0),
		mix(texelFetch(uBoneSampler,ivec2(1,boneid+uBoneAnim.s),0),texelFetch(uBoneSampler,ivec2(1,boneid+uBoneAnim.t),0),float(uBoneAnim.p)/512.0),
		mix(texelFetch(uBoneSampler,ivec2(2,boneid+uBoneAnim.s),0),texelFetch(uBoneSampler,ivec2(2,boneid+uBoneAnim.t),0),float(uBoneAnim.p)/512.0),
		mix(texelFetch(uBoneSampler,ivec2(3,boneid+uBoneAnim.s),0),texelFetch(uBoneSampler,ivec2(3,boneid+uBoneAnim.t),0),float(uBoneAnim.p)/512.0)
	);
	/*/
	float numBones=64.0;
	float v = (aBoneId + 0.5) / numBones;
	v=0.5;
	mat4 bonematrix=mat4(
		texture(uBoneSampler, vec2(0.5, v)),
		texture(uBoneSampler, vec2(1.5, v)),
		texture(uBoneSampler, vec2(2.5, v)),
		texture(uBoneSampler, vec2(3.5, v))
	);
	//*/

	//bonematrix=mat4(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1);
	gl_Position = uViewMatrix * uModelMatrix*bonematrix* vec4(aVertexPosition, 1.0);
	//*/
	//gl_Position = uViewMatrix * uModelMatrix * vec4(aVertexPosition, 1.0);
	vColor = aVertexColor;
    vTexSubUV = aTexSubUV;
	vSubTexInfo = aSubTexInfo;
	vVertexFlags = aVertexFlags;
}