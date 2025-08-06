"use client"

import { useRef, useState, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Stars, Text } from "@react-three/drei"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from 'lucide-react'
import { GeistMono } from "geist/font/mono"
import { type Mesh, type ShaderMaterial, type MeshStandardMaterial, Vector3, BufferGeometry, type Group, RingGeometry } from "three"

type ViewMode = "wireframe" | "solid"

// Planet data with realistic relative sizes and distances (scaled for visualization)
const PLANET_DATA = {
  mercury: { size: 0.4, distance: 8, speed: 4.0, color: "#B8860B", moons: [] },
  venus: { size: 0.9, distance: 12, speed: 1.6, color: "#FFA500", moons: [] },
  earth: { size: 1.0, distance: 15, speed: 1.0, color: "#4169E1", moons: [
    { name: "Moon", size: 0.27, distance: 3, speed: 13.0, color: "#D3D3D3" }
  ]},
  mars: { size: 0.5, distance: 20, speed: 0.5, color: "#FF4500", moons: [
    { name: "Phobos", size: 0.1, distance: 1.5, speed: 20.0, color: "#A0522D" },
    { name: "Deimos", size: 0.08, distance: 2.2, speed: 12.0, color: "#A0522D" }
  ]},
  jupiter: { size: 2.5, distance: 30, speed: 0.08, color: "#DAA520", moons: [
    { name: "Io", size: 0.3, distance: 4, speed: 8.0, color: "#FFFF00" },
    { name: "Europa", size: 0.25, distance: 5, speed: 6.0, color: "#87CEEB" },
    { name: "Ganymede", size: 0.4, distance: 6.5, speed: 4.5, color: "#CD853F" },
    { name: "Callisto", size: 0.35, distance: 8, speed: 3.0, color: "#A9A9A9" }
  ]},
  saturn: { size: 2.2, distance: 40, speed: 0.03, color: "#F4A460", moons: [
    { name: "Titan", size: 0.4, distance: 6, speed: 2.0, color: "#DEB887" }
  ]},
  uranus: { size: 1.8, distance: 50, speed: 0.01, color: "#40E0D0", moons: [
    { name: "Miranda", size: 0.15, distance: 3, speed: 8.0, color: "#D3D3D3" },
    { name: "Ariel", size: 0.2, distance: 4, speed: 6.0, color: "#D3D3D3" }
  ]},
  neptune: { size: 1.7, distance: 60, speed: 0.006, color: "#1E90FF", moons: [
    { name: "Triton", size: 0.3, distance: 4.5, speed: 3.0, color: "#B0E0E6" }
  ]}
}

// Custom shader for organic gradient
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  // Noise function
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
  }
  
  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Create flowing organic pattern
    float time = uTime * 0.3;
    
    // Multiple layers of noise for complexity
    float noise1 = snoise(vec3(uv * 3.0, time));
    float noise2 = snoise(vec3(uv * 6.0, time * 0.7));
    float noise3 = snoise(vec3(uv * 12.0, time * 0.5));
    
    // Combine noises for organic flow
    float pattern = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    
    // Add swirling motion
    vec2 swirl = vec2(
      sin(uv.y * 6.28 + time) * 0.1,
      cos(uv.x * 6.28 + time * 0.8) * 0.1
    );
    
    float finalPattern = pattern + length(swirl);
    
    // Define colors - teal to deep blue gradient
    vec3 tealColor = vec3(0.204,0.827,0.6); // emerald-400
    vec3 skyColor = vec3(1., 1., 1.);  // white
    vec3 deepBlue = vec3(0.008,0.518,0.78);  // sky-600
    
    // Create smooth gradient based on pattern
    float t = smoothstep(-0.5, 0.5, finalPattern);
    vec3 color = mix(deepBlue, mix(skyColor, tealColor, sin(finalPattern * 3.14 + time) * 0.5 + 0.5), t);
    
    // Add some brightness variation
    color *= 0.8 + 0.4 * smoothstep(-0.3, 0.3, finalPattern);
    
    gl_FragColor = vec4(color, 1.0);
  }
`

export default function Component() {
  const [speed, setSpeed] = useState([1.0])
  const [gravity, setGravity] = useState([1.0])
  const [isOpen, setIsOpen] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("wireframe")
  const [showSun, setShowSun] = useState(false)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const [showPlanets, setShowPlanets] = useState({
    mercury: false,
    venus: false,
    earth: true,
    mars: false,
    jupiter: false,
    saturn: false,
    uranus: false,
    neptune: false
  })
  const [showOrbits, setShowOrbits] = useState(true)

  return (
    <div className="w-full h-screen bg-gray-900 relative">
      <Canvas camera={{ position: [0, 20, 40], fov: 60 }}>
        <color attach="background" args={["#0a0a0a"]} />
        <ambientLight intensity={showSun ? 0.1 : 0.2} />
        {!showSun && <pointLight position={[10, 10, 10]} intensity={0.5} />}
        <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade />

        <SolarSystem 
          speed={speed[0]} 
          gravity={gravity[0]} 
          viewMode={viewMode} 
          showSun={showSun}
          showPlanets={showPlanets}
          showOrbits={showOrbits}
        />

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={10} maxDistance={150} />
      </Canvas>

      <div className="absolute top-4 left-4 z-10">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div
            className={`w-96 p-6 border dark rounded-lg ${GeistMono.className}`}
            style={{
              backgroundColor: "rgba(21, 21, 21, 0.8)",
              borderColor: "#808080",
            }}
          >
            <CollapsibleTrigger className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity">
              <ChevronDown
                className={`h-5 w-5 text-white transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`}
              />
              <h1 className="text-xl text-white font-semibold">Solar System Controls</h1>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-8">
              <div className="space-y-6">
                <div>
                  <label className="text-base font-normal text-white mb-3 block">View Mode</label>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "wireframe" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("wireframe")}
                      className={`flex-1 text-sm ${viewMode === "wireframe" ? "!text-black" : "!text-white"}`}
                    >
                      Wireframe
                    </Button>
                    <Button
                      variant={viewMode === "solid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("solid")}
                      className={`flex-1 text-sm ${viewMode === "solid" ? "!text-black" : "!text-white"}`}
                    >
                      Solid
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-base font-normal text-white mb-3 block">
                    Orbital Speed {speed[0].toFixed(1)}x
                  </label>
                  <Slider
                    value={speed}
                    onValueChange={setSpeed}
                    max={5.0}
                    min={0.1}
                    step={0.1}
                    className="w-full dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="text-base font-normal text-white mb-3 block">
                    Gravitational Pull {gravity[0].toFixed(1)}x
                  </label>
                  <Slider
                    value={gravity}
                    onValueChange={setGravity}
                    max={3.0}
                    min={0.1}
                    step={0.1}
                    className="w-full dark:bg-gray-800"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="showOrbits"
                      checked={showOrbits}
                      onChange={(e) => setShowOrbits(e.target.checked)}
                      className="w-4 h-4 text-blue-400 bg-gray-700 border-gray-600 rounded focus:ring-blue-400"
                    />
                    <label htmlFor="showOrbits" className="text-white text-base">
                      Show Orbital Paths
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-sm text-gray-300 space-y-1">
                <p>• Planets orbit at realistic relative speeds</p>
                <p>• Speed controls overall system velocity</p>
                <p>• Gravity affects moon orbital radius</p>
                <p>• Use mouse to rotate, zoom, and pan</p>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <Collapsible open={isRightPanelOpen} onOpenChange={setIsRightPanelOpen}>
          <div
            className={`w-80 p-6 border dark rounded-lg ${GeistMono.className} max-h-[80vh] overflow-y-auto`}
            style={{
              backgroundColor: "rgba(21, 21, 21, 0.8)",
              borderColor: "#808080",
            }}
          >
            <CollapsibleTrigger className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity">
              <ChevronDown
                className={`h-5 w-5 text-white transition-transform duration-200 ${isRightPanelOpen ? "rotate-0" : "-rotate-90"}`}
              />
              <h1 className="text-xl text-white font-semibold">Planets & Moons</h1>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-8">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="showSun"
                      checked={showSun}
                      onChange={(e) => setShowSun(e.target.checked)}
                      className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400"
                    />
                    <label htmlFor="showSun" className="text-white text-base font-medium">
                      ☀️ Sun
                    </label>
                  </div>
                </div>

                {Object.entries(PLANET_DATA).map(([planetName, data]) => (
                  <div key={planetName}>
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        id={planetName}
                        checked={showPlanets[planetName as keyof typeof showPlanets]}
                        onChange={(e) => setShowPlanets(prev => ({
                          ...prev,
                          [planetName]: e.target.checked
                        }))}
                        className="w-4 h-4 text-blue-400 bg-gray-700 border-gray-600 rounded focus:ring-blue-400"
                      />
                      <label htmlFor={planetName} className="text-white text-sm font-medium capitalize">
                        🪐 {planetName}
                      </label>
                    </div>
                    {data.moons.length > 0 && (
                      <div className="ml-6 text-xs text-gray-400">
                        Moons: {data.moons.map(moon => moon.name).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 text-sm text-gray-300 space-y-1">
                <p>• Planets shown with major moons</p>
                <p>• Relative sizes and distances</p>
                <p>• Realistic orbital mechanics</p>
                <p>• Toggle individual planets</p>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  )
}

function SolarSystem({ speed, gravity, viewMode, showSun, showPlanets, showOrbits }: { 
  speed: number; 
  gravity: number; 
  viewMode: ViewMode; 
  showSun: boolean;
  showPlanets: any;
  showOrbits: boolean;
}) {
  return (
    <group>
      {showSun && <Sun />}
      {showOrbits && <PlanetaryOrbits showPlanets={showPlanets} showSun={showSun} />}
      {Object.entries(PLANET_DATA).map(([planetName, data]) => 
        showPlanets[planetName] && (
          <Planet
            key={planetName}
            name={planetName}
            data={data}
            speed={speed}
            gravity={gravity}
            viewMode={viewMode}
            showOrbits={showOrbits}
            showSun={showSun}
            showPlanets={showPlanets}
          />
        )
      )}
    </group>
  )
}

function PlanetaryOrbits({ showPlanets, showSun }: { showPlanets: any; showSun: boolean }) {
  // Count how many planets are selected
  const selectedPlanetsCount = Object.values(showPlanets).filter(Boolean).length
  
  // Only show planetary orbits if sun is shown OR more than one planet is selected
  const showPlanetaryOrbits = showSun || selectedPlanetsCount > 1
  
  return (
    <group>
      {showPlanetaryOrbits && Object.entries(PLANET_DATA).map(([planetName, data]) => 
        showPlanets[planetName] && (
          <OrbitPath key={`${planetName}-orbit`} radius={data.distance} />
        )
      )}
    </group>
  )
}

function MoonOrbits({ moonData, gravity }: { moonData: any; gravity: number }) {
  const orbitRadius = moonData.distance / Math.sqrt(gravity)
  const points = []

  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2
    points.push(new Vector3(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius))
  }

  const geometry = new BufferGeometry().setFromPoints(points)

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#ffffff" opacity={0.4} transparent />
    </line>
  )
}

function Planet({ name, data, speed, gravity, viewMode, showOrbits, showSun, showPlanets }: { 
  name: string; 
  data: any; 
  speed: number; 
  gravity: number; 
  viewMode: ViewMode; 
  showOrbits: boolean;
  showSun: boolean;
  showPlanets: any;
}) {
  const planetGroupRef = useRef<Group>(null)
  const planetRef = useRef<Mesh>(null)
  const shaderMaterialRef = useRef<ShaderMaterial>(null)

  const shaderUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  )

  // Count how many planets are selected
  const selectedPlanetsCount = Object.values(showPlanets).filter(Boolean).length
  // Position planets at their solar system distances if sun is shown OR multiple planets are selected
  const shouldUseSolarSystemPosition = showSun || selectedPlanetsCount > 1

  useFrame((state, delta) => {
    if (planetGroupRef.current && shouldUseSolarSystemPosition) {
      // Planet orbits around the sun when sun is shown OR multiple planets are selected
      planetGroupRef.current.rotation.y += delta * data.speed * speed * 0.1
    }

    if (planetRef.current) {
      // Planet rotates on its own axis
      planetRef.current.rotation.y += delta * 0.5
    }

    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  const planetPosition = shouldUseSolarSystemPosition ? [data.distance, 0, 0] : [0, 0, 0]

  return (
    <group ref={planetGroupRef}>
      <group position={planetPosition}>
        <mesh ref={planetRef}>
          <sphereGeometry args={[data.size, 32, 32]} />
          {viewMode === "wireframe" ? (
            <meshStandardMaterial color={data.color} wireframe={true} wireframeLinewidth={2} />
          ) : name === "earth" ? (
            <shaderMaterial
              ref={shaderMaterialRef}
              vertexShader={vertexShader}
              fragmentShader={fragmentShader}
              uniforms={shaderUniforms}
            />
          ) : (
            <meshStandardMaterial color={data.color} metalness={0.3} roughness={0.7} />
          )}
          <Text 
            position={[0, -data.size - 0.5, 0]} 
            fontSize={0.3} 
            color="white" 
            anchorX="center" 
            anchorY="middle"
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </Text>
        </mesh>

        {/* Render moons */}
        {data.moons.map((moon: any, index: number) => (
          <Moon
            key={`${name}-${moon.name}`}
            moonData={moon}
            speed={speed}
            gravity={gravity}
            viewMode={viewMode}
          />
        ))}

        {/* Render moon orbits */}
        {showOrbits && data.moons.map((moon: any, index: number) => (
          <MoonOrbits
            key={`${name}-${moon.name}-orbit`}
            moonData={moon}
            gravity={gravity}
          />
        ))}

        {/* Saturn's rings */}
        {name === "saturn" && (
          <SaturnRings viewMode={viewMode} />
        )}
      </group>
    </group>
  )
}

function Moon({ moonData, speed, gravity, viewMode }: { 
  moonData: any; 
  speed: number; 
  gravity: number; 
  viewMode: ViewMode; 
}) {
  const moonRef = useRef<Mesh>(null)
  const moonGroupRef = useRef<Group>(null)

  const orbitRadius = moonData.distance / Math.sqrt(gravity)

  useFrame((state, delta) => {
    if (moonGroupRef.current && moonRef.current) {
      const orbitalSpeed = moonData.speed * speed * 0.1
      moonGroupRef.current.rotation.y += delta * orbitalSpeed
      moonRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <group ref={moonGroupRef}>
      <mesh ref={moonRef} position={[orbitRadius, 0, 0]}>
        <sphereGeometry args={[moonData.size, 16, 16]} />
        {viewMode === "wireframe" ? (
          <meshStandardMaterial color={moonData.color} wireframe={true} wireframeLinewidth={1} />
        ) : (
          <meshStandardMaterial color={moonData.color} metalness={0.2} roughness={0.8} />
        )}
        <Text 
          position={[0, -moonData.size - 0.3, 0]} 
          fontSize={0.15} 
          color="white" 
          anchorX="center" 
          anchorY="middle"
        >
          {moonData.name}
        </Text>
      </mesh>
    </group>
  )
}

function SaturnRings({ viewMode }: { viewMode: ViewMode }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3, 4, 64]} />
        {viewMode === "wireframe" ? (
          <meshStandardMaterial color="#FAD5A5" wireframe={true} side={2} />
        ) : (
          <meshStandardMaterial color="#FAD5A5" transparent opacity={0.6} side={2} />
        )}
      </mesh>
    </group>
  )
}

function OrbitPath({ radius }: { radius: number }) {
  const points = []

  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2
    points.push(new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
  }

  const geometry = new BufferGeometry().setFromPoints(points)

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#ffffff" opacity={0.3} transparent />
    </line>
  )
}

function Sun() {
  const sunRef = useRef<Mesh>(null)
  const shaderMaterialRef = useRef<ShaderMaterial>(null)

  const sunShaderUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  )

  useFrame((state, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.05
    }

    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  const sunFragmentShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec2 uv = vUv;
      float time = uTime * 0.5;
      
      float pattern = sin(uv.x * 10.0 + time) * cos(uv.y * 10.0 + time * 0.7);
      pattern += sin(uv.x * 20.0 + time * 1.3) * cos(uv.y * 15.0 + time * 0.9) * 0.5;
      
      vec3 yellow = vec3(1.0, 1.0, 0.0);
      vec3 orange = vec3(1.0, 0.5, 0.0);
      vec3 red = vec3(1.0, 0.2, 0.0);
      
      float t = (pattern + 1.0) * 0.5;
      vec3 color = mix(red, mix(orange, yellow, t), t);
      
      color *= 1.5 + 0.5 * sin(time + pattern);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `

  return (
    <mesh ref={sunRef} position={[0, 0, 0]}>
      <sphereGeometry args={[3, 64, 64]} />
      <shaderMaterial
        ref={shaderMaterialRef}
        vertexShader={vertexShader}
        fragmentShader={sunFragmentShader}
        uniforms={sunShaderUniforms}
      />
      <Text position={[0, -4, 0]} fontSize={0.4} color="yellow" anchorX="center" anchorY="middle">
        Sun
      </Text>
      <pointLight position={[0, 0, 0]} intensity={2} color="yellow" distance={200} />
    </mesh>
  )
}
