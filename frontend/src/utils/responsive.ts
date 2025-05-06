import { useEffect, useState } from "react";

/**
 * 判断当前是否为移动端（H5）
 * @returns boolean
 */
export function useIsMobile(breakpoint: number = 600): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined"
      ? window.innerWidth <= breakpoint
      : false
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= breakpoint);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}