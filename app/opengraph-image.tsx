import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'Miit Daga - Portfolio';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#000000',
                    backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%)',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Background Grid Effect */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                        opacity: 0.1,
                    }}
                />

                {/* Glowing Orb */}
                <div
                    style={{
                        position: 'absolute',
                        width: '600px',
                        height: '600px',
                        background: 'radial-gradient(circle, rgba(45,212,191,0.3) 0%, rgba(0,0,0,0) 70%)',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        filter: 'blur(40px)',
                    }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                    {/* Title */}
                    <h1
                        style={{
                            fontSize: 100,
                            fontWeight: 900,
                            background: 'linear-gradient(to bottom right, #ffffff, #94a3b8)',
                            backgroundClip: 'text',
                            color: 'transparent',
                            margin: 0,
                            letterSpacing: '-0.05em',
                        }}
                    >
                        Miit Daga
                    </h1>

                    {/* Subtitle / Tagline */}
                    <div
                        style={{
                            fontSize: 40,
                            fontWeight: 400,
                            color: '#2dd4bf', // Teal color matching your theme
                            marginTop: 20,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Code that powers the unseen
                    </div>
                </div>

                {/* Tech Stack Pills at Bottom */}
                <div style={{ display: 'flex', gap: 20, position: 'absolute', bottom: 60 }}>
                    {['Next.js', 'React', 'Node.js', 'AWS', 'AI/ML'].map((tech) => (
                        <div
                            key={tech}
                            style={{
                                padding: '10px 25px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 999,
                                color: '#a1a1aa',
                                fontSize: 20,
                            }}
                        >
                            {tech}
                        </div>
                    ))}
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}