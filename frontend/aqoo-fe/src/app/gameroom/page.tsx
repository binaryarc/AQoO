"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRecoilState } from "recoil";
import { usersState } from "@/store/participantAtom";
import FriendList from "./FriendList";
import ParticipantList from "./ParticipantList";

// localStorage 안전하게 접근하는 헬퍼 함수
const getLocalStorageItem = (key: string, defaultValue: string = "guest"): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key) ?? defaultValue;
  }
  return defaultValue;
};

export default function GameRoomPage() {
  const [participants, setParticipants] = useRecoilState(usersState);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  // 클라이언트 사이드에서만 localStorage에 접근하여 사용자 이름을 설정
  useEffect(() => {
    const storedUserName = getLocalStorageItem("loggedInUser", "guest");
    setUserName(storedUserName);
  }, []);

  // 방장 자동 지정 (이전 참가자가 있을 경우만)
  useEffect(() => {
    if (participants.length > 0 && !participants[0]?.isHost) {
      setParticipants((prev) => {
        const updatedParticipants = [...prev];
        updatedParticipants[0] = { ...updatedParticipants[0], isHost: true };
        return updatedParticipants;
      });
    }
  }, [participants.length]);

  // 채팅방 생성 핸들러
  const handleCreateRoom = async () => {
    if (participants.length === 0) {
      alert("⚠ 참가자를 한 명 이상 추가해주세요.");
      return;
    }

    if (!userName) {
      alert("⚠ 사용자 이름을 확인할 수 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://i12e203.p.ssafy.io/api/v1/chatrooms?userId=${encodeURIComponent(userName)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Room creation failed");
      }

      const data = await response.json();
      const roomId = data.roomId;
      console.log("✅ Created roomId:", roomId);

      // 새로운 경로로 이동
      router.push(
        `/room/${roomId}?userName=${encodeURIComponent(userName)}&isHost=true`
      );
    } catch (error) {
      console.error("❌ Error creating room:", error);
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류 발생";
      alert(`채팅방 생성 실패: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/images/background.png')" }}
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-white opacity-20"></div>
  
      {/* 전체 컨테이너 */}
      <div className="relative z-10 flex flex-col items-center">
        {/* 친구 리스트 + 참가자 리스트 감싸는 네모 박스 */}
        <div className="relative flex gap-6 p-6 bg-white bg-opacity-30 border border-black rounded-lg shadow-lg w-[800px] h-[500px]">
          <FriendList />
          <ParticipantList />
  
          {/* 방 만들기 */}
          <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 px-6 py-2 bg-white border border-black rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold text-black text-center">
              🎮 방 만들기 🕹️
            </h1>
          </div>
        </div>
      </div>

      {/* 만들기 버튼 */}
      <button
      className="absolute bottom-5 right-5 px-5 py-2 rounded border border-black bg-white text-xl"
      onClick={handleCreateRoom}
      >
        만들기
      </button>
      {/* 뒤로가기 버튼 */}
      <button className="absolute bottom-5 left-5 px-5 py-2 rounded border border-black bg-white text-xl">
        BACK
      </button>
    </div>
  );
}