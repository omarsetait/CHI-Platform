import { motion } from "framer-motion";
import chiBuildingImg from "@/assets/chi-building-real.png";

export function BuildingBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-gradient-to-b from-sky-200 via-sky-100 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black">

            {/* Elements for Light Mode Only */}
            <div className="dark:hidden absolute inset-0">
                {/* Animated Clouds */}
                <motion.div
                    className="absolute top-20 left-10 w-64 h-24 bg-white/80 rounded-full blur-2xl"
                    animate={{ x: ["0vw", "100vw"] }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute top-40 -left-40 w-96 h-32 bg-white/60 rounded-full blur-[40px]"
                    animate={{ x: ["0vw", "100vw"] }}
                    transition={{ duration: 80, delay: 10, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute top-10 -right-20 w-72 h-32 bg-white/70 rounded-full blur-2xl"
                    animate={{ x: ["0vw", "-100vw"] }}
                    transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                />

                {/* Animated Birds (Flock) */}
                <motion.div
                    className="absolute top-32 left-0 text-slate-600/60"
                    initial={{ x: "-10vw", y: 0 }}
                    animate={{ x: "110vw", y: [-20, 20, -10, 30, 0] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                >
                    <svg width="120" height="40" viewBox="0 0 120 40" fill="currentColor">
                        <path d="M10 20 Q15 10 20 20 Q15 15 10 20" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path d="M20 20 Q25 10 30 20 Q25 15 20 20" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path d="M40 10 Q45 0 50 10 Q45 5 40 10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.8" />
                        <path d="M50 10 Q55 0 60 10 Q55 5 50 10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.8" />
                        <path d="M70 25 Q75 15 80 25 Q75 20 70 25" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.9" />
                        <path d="M80 25 Q85 15 90 25 Q85 20 80 25" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.9" />
                        <path d="M95 15 Q100 5 105 15 Q100 10 95 15" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
                        <path d="M105 15 Q110 5 115 15 Q110 10 105 15" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
                    </svg>
                </motion.div>

                {/* Another flock, slower */}
                <motion.div
                    className="absolute top-52 right-0 text-slate-500/50"
                    initial={{ x: "110vw", y: 0 }}
                    animate={{ x: "-10vw", y: [10, -30, 0, -10, 10] }}
                    transition={{ duration: 45, delay: 5, repeat: Infinity, ease: "linear" }}
                >
                    <svg width="80" height="30" viewBox="0 0 80 30" fill="currentColor">
                        <path d="M0 15 Q5 5 10 15 Q5 10 0 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <path d="M10 15 Q15 5 20 15 Q15 10 10 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <path d="M30 5 Q35 -5 40 5 Q35 0 30 5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.7" />
                        <path d="M40 5 Q45 -5 50 5 Q45 0 40 5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.7" />
                    </svg>
                </motion.div>
            </div>

            {/* Elements for Dark Mode Only */}
            <div className="hidden dark:block absolute inset-0">
                {/* Twinkling Stars */}
                {Array.from({ length: 60 }).map((_, i) => (
                    <motion.div
                        key={`star-${i}`}
                        className="absolute bg-white rounded-full"
                        style={{
                            width: Math.random() * 2 + 1 + "px",
                            height: Math.random() * 2 + 1 + "px",
                            left: Math.random() * 100 + "%",
                            top: Math.random() * 90 + "%",
                            opacity: Math.random() * 0.5 + 0.1
                        }}
                        animate={{ opacity: [0.1, 0.9, 0.1] }}
                        transition={{ duration: Math.random() * 4 + 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                ))}

                {/* Shooting Star */}
                <motion.div
                    className="absolute top-0 right-[10%] w-[1px] h-[100px] bg-gradient-to-b from-transparent via-white to-transparent rotate-[-45deg] blur-[1px]"
                    initial={{ x: "10vw", y: "-10vh", opacity: 0 }}
                    animate={{ x: "-60vw", y: "60vh", opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 15, ease: "linear" }}
                />
                <motion.div
                    className="absolute top-[20%] right-[30%] w-[1.5px] h-[120px] bg-gradient-to-b from-transparent via-blue-100 to-transparent rotate-[-45deg] blur-[1px]"
                    initial={{ x: "10vw", y: "-10vh", opacity: 0 }}
                    animate={{ x: "-40vw", y: "40vh", opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 22, ease: "linear" }}
                />
            </div>

            {/* The Majestic Real Daman / CHI Building */}
            <div className="absolute -bottom-10 -right-10 md:-right-10 lg:right-20 w-[120%] md:w-[700px] lg:w-[850px] h-[95vh] z-10 opacity-95 pointer-events-none flex justify-end items-end mix-blend-luminosity dark:mix-blend-normal">
                <motion.div
                    className="relative w-full h-full"
                    initial={{ y: "20%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* Image with a highly aggressive radial gradient mask so it blends perfectly on all sides without looking detached */}
                    <img
                        src={chiBuildingImg}
                        alt="CHI Building"
                        className="object-cover object-bottom w-full h-[120%] -translate-y-[10%]"
                        style={{
                            WebkitMaskImage: 'radial-gradient(ellipse at 80% 60%, black 15%, transparent 60%)',
                            maskImage: 'radial-gradient(ellipse at 80% 60%, black 15%, transparent 60%)',
                        }}
                    />
                </motion.div>
            </div>

            {/* Abstract Animated Other Data Nodes to balance the composition */}
            <div className="absolute top-0 left-0 w-full h-full">
                {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-blue-500/20 dark:bg-blue-400/20 blur-sm"
                        style={{
                            width: Math.random() * 8 + 4 + "px",
                            height: Math.random() * 8 + 4 + "px",
                            left: Math.random() * 60 + "%",
                            top: Math.random() * 80 + 10 + "%",
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.1, 0.6, 0.1],
                        }}
                        transition={{
                            duration: Math.random() * 4 + 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>

            {/* Ground Fade */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-200/50 dark:from-slate-950 to-transparent z-20" />
        </div>
    );
}
