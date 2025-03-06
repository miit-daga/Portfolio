import { BackgroundGradientAnimation } from "./ui/background-gradient-animation";
const Hero = () => {
  return (

    <div className="flex flex-col items-center justify-center h-screen">
      <BackgroundGradientAnimation>
      <div className="absolute z-50 inset-0 flex items-center justify-center text-white font-bold px-4 pointer-events-none text-3xl text-center md:text-4xl lg:text-7xl">
        <p className="bg-clip-text text-transparent text-6xl lg:text-9xl drop-shadow-2xl text-white">
          Miit Daga
        </p>
      </div>
      </BackgroundGradientAnimation>
    </div>

  )
}

export default Hero