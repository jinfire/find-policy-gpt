import type { Metadata } from "next";
import { PolicyFinder } from "./components/PolicyFinder";

export const metadata: Metadata = {
  title: "혜택나침반 | 놓치고 있던 정부 혜택 찾기",
  description:
    "내 상황을 한 번 입력하면 신청 가능성이 있는 정부 지원금과 정책대출, 추천 이유를 함께 알려드립니다.",
};

export default function Home() {
  return <PolicyFinder />;
}
