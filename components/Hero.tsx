// import { BackgroundGradientAnimation } from "./ui/background-gradient-animation";
// import { TypewriterEffect } from "./ui/typewriter-effect"; // Import the component

// const Hero = () => {
//   return (
//     <div className="flex flex-col items-center justify-center h-screen">
//       <BackgroundGradientAnimation>
//         <div className="absolute z-50 inset-0 flex flex-col items-center justify-center text-white font-bold px-4 pointer-events-none text-center">
//           <p className="bg-clip-text text-transparent text-6xl lg:text-9xl drop-shadow-2xl text-white">
//             Miit Daga
//           </p>
//           <div className="mt-4"> {/* Added margin-top for better spacing */}
//             <TypewriterEffect
//               words={[
//                 { text: "Code", className: "text-gray-300" },
//                 { text: "That", className: "text-gray-300" },
//                 { text: "Powers", className: "text-gray-300" },
//                 { text: "the", className: "text-gray-300" },
//                 { text: "Unseen.", className: "text-gray-300" }
//               ]}
//               className="text-lg lg:text-2.5xl"
//               cursorClassName="bg-gray-300"
//             />
//           </div>
//         </div>
//       </BackgroundGradientAnimation>
//     </div>
//   );
// };

// export default Hero;
import { BackgroundGradientAnimation } from "./ui/background-gradient-animation";
import { TypewriterEffect } from "./ui/typewriter-effect";

const Hero = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <BackgroundGradientAnimation>
        <div className="absolute z-50 inset-0 flex flex-col items-center justify-center text-white font-bold px-4 pointer-events-none text-center">
          <p className="bg-clip-text text-transparent text-6xl lg:text-9xl drop-shadow-2xl text-white">
            Miit Daga
          </p>
          <div className="mt-4 w-full flex justify-center">
            <TypewriterEffect
              words={[
                { text: "Code", className: "text-gray-300" },
                { text: "That", className: "text-gray-300" },
                { text: "Powers", className: "text-gray-300" },
                { text: "the", className: "text-gray-300" },
                { text: "Unseen.", className: "text-gray-300" }
              ]}
              className="text-lg lg:text-2.5xl"
              cursorClassName="bg-gray-300"
              repeat={true}
              repeatDelay={5000}
            />
          </div>
        </div>
      </BackgroundGradientAnimation>
    </div>
  );
};

export default Hero;