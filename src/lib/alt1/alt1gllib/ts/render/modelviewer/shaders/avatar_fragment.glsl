#version 300 es

precision mediump float;
in lowp vec4 vColor;
in highp vec2 vTexSubUV;
in highp vec3 vSubTexInfo;
in mediump float vVertexFlags;

uniform float uEnableTextures;
uniform sampler2D uSampler;

out vec4 oFragColor;


void main(void) {
	const float effectiveTrans=1.0/255.0/2.0;

	float flags=vVertexFlags*(255.0/2.0);
	float alpha=step(0.5,fract(flags/1.0));
	float texalpha=step(0.5,fract(flags/2.0));
	float vertexdiffuse=step(0.5,fract(flags/4.0));

	vec4 col=vec4(0.0);
	vec4 colsample;
	if(uEnableTextures>0.5){
		colsample=texture(uSampler, vSubTexInfo.st+ fract(vTexSubUV)*vec2(vSubTexInfo.p));
	}else{
		colsample=vec4(1);
	}
	if(vertexdiffuse>0.5){
		if(vColor.a<effectiveTrans){
			discard;
		}
		colsample.rgb*=vColor.rgb;
		//if(alpha<0.5){
			colsample.a*=vColor.a;
		//}
	}
	col+=colsample;
	//can be discarded for transparency even if opaqueness if forced
	if(col.a<effectiveTrans){discard;}
	oFragColor=col;


	//gl_FragColor=vec4(vTexSubUV,0,1);
	//gl_FragColor=vec4(vSubTexInfo.stp,1);
	//gl_FragColor =texture2D(uSampler, vSubTexInfo.st+ fract(vTexSubUV)*vec2(vSubTexInfo.p));
	//gl_FragColor=vec4(alpha,texalpha,vertexdiffuse,1.);
}