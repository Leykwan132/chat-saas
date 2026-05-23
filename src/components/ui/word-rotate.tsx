import { useEffect, useState } from "react"
import { AnimatePresence, motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

interface WordRotateProps {
  words: string[]
  duration?: number
  /** When set, shows that word and animates on change — no auto-rotation. */
  activeIndex?: number
  motionProps?: MotionProps
  className?: string
  inline?: boolean
}

export function WordRotate({
  words,
  duration = 2500,
  activeIndex,
  motionProps = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
    transition: { duration: 0.25, ease: "easeOut" },
  },
  className,
  inline = false,
}: WordRotateProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const index = activeIndex ?? internalIndex
  const word = words[index] ?? words[0]

  useEffect(() => {
    if (activeIndex !== undefined) return

    const interval = setInterval(() => {
      setInternalIndex((prevIndex) => (prevIndex + 1) % words.length)
    }, duration)

    return () => clearInterval(interval)
  }, [words, duration, activeIndex])

  const MotionTag = inline ? motion.span : motion.h1
  const Wrapper = inline ? "span" : "div"

  return (
    <Wrapper className={cn("overflow-hidden", inline ? "inline-block align-baseline" : "py-2")}>
      <AnimatePresence mode="wait">
        <MotionTag
          key={word}
          className={cn(inline && "inline-block", className)}
          {...motionProps}
        >
          {word}
        </MotionTag>
      </AnimatePresence>
    </Wrapper>
  )
}
