"use client";

import { AquariumData, UserInfo } from "@/types";
import React, { useEffect, useRef, useState } from "react";
import { increaseUserExp } from "@/services/userService";
import LevelUpModal from "@/components/LevelUpModal"; // ✅ 레벨업 모달 추가

import axios, { AxiosResponse } from "axios";

import BottomMenuBar from "@/app/main/BottomMenuBar";
import CleanComponent from "@/app/main/CleanComponent";
import FriendsList from "@/app/main/FriendsList";
import Image from "next/image";
import Link from "next/link";
import PushNotifications from "@/app/main/PushNotifications";
import { gsap } from "gsap";
import { useAuth } from "@/hooks/useAuth"; // ✅ 로그인 정보 가져오기

// 🔹 물고기 데이터 타입 정의
interface FishData {
  fishTypeId: number;
  fishTypeName: string;
  fishImage: string;
}
export default function MainPage() {
  const { auth } = useAuth(); // ✅ 로그인한 유저 정보 가져오기

  const [background, setBackground] = useState("/background-1.png");
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [fishes, setFishes] = useState<FishData[]>([]);
  const [aquariumData, setAquariumData] = useState<AquariumData | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number; expProgress: number } | null>(null);

  const API_BASE_URL = "https://i12e203.p.ssafy.io/api/v1";

  // ✅ 어항 상태 새로고침 함수 추가
  const refreshAquariumData = async () => {
    if (!userInfo?.mainAquarium) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/aquariums/${userInfo.mainAquarium}`);
      console.log("✅ 어항 상태 갱신:", response.data);
      setAquariumData(response.data);
    } catch (error) {
      console.error("❌ 어항 상태 불러오기 실패", error);
    }
  };

  // ✅ 경험치 증가 & 레벨업 체크 함수
  const handleIncreaseExp = async (earnedExp: number) => {
    if (!auth.user?.id) return;

    const prevLevel = userInfo?.level ?? 1; // 기존 레벨 저장

    // ✅ 경험치 증가 API 호출
    const updatedExpData = await increaseUserExp(auth.user.id, earnedExp);

    if (updatedExpData) {
      await refreshUserInfo();

      // ✅ 레벨업 확인
      if (updatedExpData.userLevel > prevLevel) {
        console.log("🎉 레벨업 발생! 새로운 레벨:", updatedExpData.userLevel);
        setLevelUpInfo({ level: updatedExpData.userLevel, expProgress: updatedExpData.expProgress });
      }
    }
  };

  const refreshUserInfo = async () => {
    if (!auth.user?.id) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/users/${auth.user.id}`);
      console.log("✅ 유저 정보 갱신 완료:", response.data);
      setUserInfo(response.data);
    } catch (error) {
      console.error("❌ 유저 정보 불러오기 실패", error);
    }
  };

  useEffect(() => {
    const savedBg = localStorage.getItem("background");
    if (savedBg) {
      setBackground(savedBg);
    }

    if (!auth.user?.id) return; // ✅ 로그인한 유저 ID가 없으면 API 호출 안 함

    axios
      .get(`${API_BASE_URL}/users/${auth.user.id}`)
      .then((response: AxiosResponse<UserInfo>) => {
        console.log("✅ 유저 정보:", response.data);
        setUserInfo(response.data);
      })
      .catch((error) => {
        console.error("❌ 유저 정보 불러오기 실패", error);
      });
  }, [auth.user?.id]); // ✅ 로그인한 유저 ID가 바뀔 때마다 실행

  useEffect(() => {
    if (!auth.user?.id) return;

    // ✅ 물고기 데이터 불러오기 (API 호출)
    axios
      .get(`${API_BASE_URL}/fish/my-fish/${auth.user.id}`)
      .then((response: AxiosResponse<FishData[]>) => {
        console.log("🐠 내 물고기 목록:", response.data);
        setFishes(response.data);
      })
      .catch((error) => {
        console.error("❌ 물고기 데이터 불러오기 실패", error);
      });
  }, [auth.user?.id]); // ✅ 로그인한 유저 ID가 바뀔 때마다 실행

  useEffect(() => {
    if (!userInfo?.mainAquarium) return;

    console.log("🐠 메인 아쿠아리움 ID:", userInfo.mainAquarium);

    axios
      .get(`${API_BASE_URL}/aquariums/${userInfo.mainAquarium}`)
      .then((res: AxiosResponse<AquariumData>) => {
        console.log("✅ 어항 상세 정보:", res.data);
        setAquariumData(res.data);
      })
      .catch((err) => console.error("❌ 어항 정보 불러오기 실패", err));
  }, [userInfo]); // ✅ `userInfo` 변경될 때 실행

  // if (!auth.user?.id) return <div>로그인이 필요합니다.</div>;
  if (!userInfo) return <div>유저 정보 불러오는 중...</div>;
  if (!aquariumData) return <div>아쿠아리움 정보 로딩 중...</div>;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <title>AQoO</title>
      {/* 🖼 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-center w-screen h-screen before:absolute before:inset-0 before:bg-white/30"
        style={{ backgroundImage: `url(${background})` }}
      ></div>

      {/* 🐠 떠다니는 물고기 렌더링 */}
      {fishes.map((fish) => (
        <Fish key={fish.fishTypeId} fish={fish} />
      ))}

      {/* 📌 하단 메뉴 바 */}
      <BottomMenuBar
        setActiveComponent={setActiveComponent}
        userInfo={userInfo}
        aquariumData={aquariumData}
        refreshAquariumData={refreshAquariumData}
        refreshUserData={() => handleIncreaseExp(0)} // ✅ 경험치 0으로 유저 정보만 업데이트
        handleIncreaseExp={handleIncreaseExp} // ✅ Water/Feed에서도 사용
      />

      {/* ✅ CleanComponent를 BottomMenuBar 위에 정확하게 배치 */}
      {activeComponent === "clean" && (
        <div className="absolute bottom-[130px] right-[100px] z-50">
          <CleanComponent
            onClose={() => setActiveComponent(null)}
            onCleanSuccess={() => {
              // ✅ 어항 상태 업데이트
              if (userInfo?.mainAquarium) {
                axios
                  .get(`${API_BASE_URL}/aquariums/${userInfo.mainAquarium}`)
                  .then((res: AxiosResponse<AquariumData>) => {
                    console.log("✅ 어항 상태 업데이트:", res.data);
                    setAquariumData(res.data);
                  })
                  .catch((err) => console.error("❌ 어항 상태 불러오기 실패", err));
              }

              // ✅ 유저 경험치 업데이트
              axios
                .get(`${API_BASE_URL}/users/${auth.user?.id}`)
                .then((response: AxiosResponse<UserInfo>) => {
                  console.log("✅ 유저 정보 업데이트:", response.data);
                  setUserInfo(response.data);
                })
                .catch((error) => {
                  console.error("❌ 유저 정보 불러오기 실패", error);
                });
            }}
          />
        </div>
      )}

      {/* ✅ FriendsList도 같은 방식 적용 */}
      {activeComponent === "friends" && (
        <div className="absolute bottom-[130px] left-[100px] z-50">
          <FriendsList onClose={() => setActiveComponent(null)} userId={userInfo.id} />
        </div>
      )}

      {/* ✅ PushNotifications도 같은 방식 적용 */}
      {activeComponent === "push" && (
        <div className="absolute bottom-[130px] left-[100px] z-50">
          <PushNotifications onClose={() => setActiveComponent(null)} />
        </div>
      )}

      {/* 📌 레벨업 모달 */}
      {/* TODO 레벨업 시 레벨업 모달 뜨게 하도록 구현 */}
      {levelUpInfo && (
        <LevelUpModal
          level={levelUpInfo.level}
          expProgress={levelUpInfo.expProgress}
          onClose={() => setLevelUpInfo(null)}
        />
      )}
    </div>
  );
}
function Fish({ fish }: { fish: FishData }) {
  const fishRef = useRef<HTMLImageElement | null>(null);
  const directionRef = useRef(1); // 기본 방향: 왼쪽 (-1)

  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!fishRef.current) return;

    gsap.to(fishRef.current, {
      scale: 0.9,
      duration: 0.15,
      ease: "power1.inOut",
      yoyo: true,
      repeat: 1,
    });
  };

  useEffect(() => {
    if (!fishRef.current) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const safeMargin = 80;
    const bottomMargin = 100;
    const upperLimit = windowHeight * 0.2; // 화면 상단 20% 이내에서는 내려가는 확률 높이기

    const randomStartX = Math.random() * (windowWidth - 2 * safeMargin) + safeMargin;
    const randomStartY = Math.random() * (windowHeight - bottomMargin - 50) + 50;

    // 물고기 초기 위치 설정 (기본 왼쪽 방향)
    gsap.set(fishRef.current, {
      x: randomStartX,
      y: randomStartY,
      scaleX: -1, // ✅ 기본 방향 유지 (왼쪽을 바라봄)
    });

    const moveFish = () => {
      if (!fishRef.current) return;

      const randomSpeed = Math.random() * 7 + 9; // 속도 랜덤
      const maxMoveX = windowWidth * (0.4 + Math.random() * 0.4);
      // eslint-disable-next-line prefer-const
      let moveDistanceX = maxMoveX * (Math.random() > 0.5 ? 1 : -1);

      const currentY = parseFloat(gsap.getProperty(fishRef.current, "y") as string);

      // 🔹 아래로 이동하는 비율 높이기
      let moveDistanceY = windowHeight * (0.1 + Math.random() * 0.15) * (Math.random() > 0.65 ? 1 : -1);

      // 🔹 화면 상단 20% 이상일 경우, 아래로 이동하는 확률을 80% 이상으로 증가
      if (currentY < upperLimit) {
        moveDistanceY = windowHeight * (0.1 + Math.random() * 0.2);
      }

      // 새로운 위치 계산
      let newX = parseFloat(gsap.getProperty(fishRef.current, "x") as string) + moveDistanceX;
      let newY = currentY + moveDistanceY;

      // 경계 제한
      if (newX < safeMargin) {
        newX = safeMargin + Math.random() * 50;
        moveDistanceX = Math.abs(moveDistanceX); // ✅ 오른쪽 이동하도록 값 변경
      }
      if (newX > windowWidth - safeMargin) {
        newX = windowWidth - safeMargin - Math.random() * 50;
        moveDistanceX = -Math.abs(moveDistanceX); // ✅ 왼쪽 이동하도록 값 변경
      }
      if (newY < 50) newY = 50 + Math.random() * 30;
      if (newY > windowHeight - bottomMargin) newY = windowHeight - bottomMargin - Math.random() * 30;

      // 방향 업데이트: 오른쪽 이동 시 -1, 왼쪽 이동 시 1
      directionRef.current = moveDistanceX > 0 ? -1 : 1;

      // 애니메이션 적용
      gsap.to(fishRef.current, {
        x: newX,
        y: newY,
        scaleX: directionRef.current, // ✅ 방향 반대로 적용
        duration: randomSpeed,
        ease: "power2.inOut",
        onUpdate: () => {
          const prevX = parseFloat(gsap.getProperty(fishRef.current, "x") as string);
          directionRef.current = newX > prevX ? -1 : 1;
          gsap.set(fishRef.current, { scaleX: directionRef.current });
        },
        onComplete: moveFish, // 계속 이동 반복
      });
    };

    moveFish();
  }, []);

  return (
    <img
      ref={fishRef}
      src={fish.fishImage}
      alt={fish.fishTypeName}
      className="absolute max-w-64 max-h-16 transform-gpu"
      onClick={handleClick}
    />

    // <Image src={fish.fishImage} alt={fish.fishTypeName} fill className="absolute max-w-64 h-16 transform-gpu"></Image>
  );
}
