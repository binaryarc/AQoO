'use client';

import { connectStompClient, getStompClient } from '@/lib/stompclient';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ChatBox from './ChatBox';
import Game from './Game';
import ParticipantList from './ParticipantList';
import FriendList from './FriendList';
import Fish from "./Fish"
import { User } from '@/store/authAtom';

// 플레이어 타입 정의
interface Player {
  userName: string;
  mainFishImage: string;
  totalPressCount: number;
}

type ScreenState = 'chat' | 'game';

interface RoomUpdate {
  roomId: string;
  message: string;
  users?: { userName: string; ready: boolean; isHost: boolean; mainFishImage: string }[];
  players?: Player[];
  targetUser?: string;
}

interface IntegratedRoomProps {
  roomId: string;
  userName: string;
  user: User;
}

interface FishData {
  aquariumId: number;
  fishId: number;
  fishTypeId: number;
  fishName: string;
  fishImage: string;
}

export default function IntegratedRoom({ roomId, userName, user }: IntegratedRoomProps) {
  const [screen, setScreen] = useState<ScreenState>('chat');
  const [users, setUsers] = useState<{ userName: string; ready: boolean; isHost: boolean; mainFishImage: string }[]>([]);
  const [gamePlayers, setGamePlayers] = useState<Player[]>([]);
  const [currentIsHost, setCurrentIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);
  const hasSentJoinRef = useRef(false);
  const router = useRouter();
  const [fishes, setFishes] = useState<FishData[]>([]);
  const [fishMessages, setFishMessages] = useState<{ [key: string]: string }>({});


  console.log("IntegratedRoom currentUser:", user);
  // 현재 참가자 수
  const participantCount = users.length;

  // 사용자 목록 상태 및 displayUsers 선언
  const displayUsers =
    currentIsHost && !users.some((u) => u.userName === userName)
      ? [...users, { userName, ready: false, isHost: true, mainFishImage: '' }]
      : users;

  // STOMP 연결 활성화
  useEffect(() => {
    connectStompClient(() => {
      console.log('STOMP client activated from IntegratedRoom.');
    });
  }, []);

  // 참가자 대표 물고기 -> fishes 배열 업데이트
  useEffect(() => {
    const fishList: FishData[] = displayUsers
      .filter((user) => user.mainFishImage)
      .map((user, index) => ({
        aquariumId: 0,
        fishId: index,
        fishTypeId: 0,
        fishName: user.userName,
        fishImage: user.mainFishImage,
      }));
    setFishes(fishList);
  }, [displayUsers]);

  // join 메시지 전송 및 구독 설정
  useEffect(() => {
    const client = getStompClient();
    if (!client) return;

    const intervalId = setInterval(() => {
      if (client.connected) {
        setIsConnected(true);
        if (!hasSentJoinRef.current) {
          const joinMessage = { roomId, sender: userName };
          client.publish({
            destination: '/app/chat.joinRoom',
            body: JSON.stringify(joinMessage),
          });
          console.log('Join room message sent:', joinMessage);
          hasSentJoinRef.current = true;
        }
        const subscription = client.subscribe(`/topic/room/${roomId}`, (message) => {
          const data: RoomUpdate = JSON.parse(message.body);
          console.log('Room update received:', data);
          if (data.message === 'GAME_STARTED') {
            setGamePlayers(data.players ?? []);
            setScreen('game');
          } else if (data.message === 'USER_LIST') {
            console.log("data.users:", data.users);
            setUsers(data.users ?? []);
          } else if (data.message === 'USER_KICKED') {
            if (data.targetUser === userName) {
              router.replace('/main?status=kicked');
            } else {
              setUsers((prevUsers) => prevUsers.filter((u) => u.userName !== data.targetUser));
            }
          }
        });
        clearInterval(intervalId);
        return () => subscription.unsubscribe();
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [roomId, userName, router]);


  // 친구 초대 함수 (참가자가 6명 이상이면 초대 불가)
  const inviteFriend = async (friendUserId: string) => {
    if (participantCount >= 6) {
      alert('참가자가 최대 인원(6명)을 초과할 수 없습니다.');
      return;
    }
    
    try {
      const response = await fetch("https://i12e203.p.ssafy.io/api/v1/chatrooms/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostId: userName,
          guestId: friendUserId,
          roomId: roomId,
        }),
      });
      if (!response.ok) {
        console.error(`Invitation failed for ${friendUserId}`);
        alert(`${friendUserId} 초대에 실패했습니다.`);
      } else {
        console.log(`Invitation succeeded for ${friendUserId}`);
        alert(`${friendUserId}님을 초대했습니다.`);
      }
    } catch (error) {
      console.error("Error inviting friend", error);
      alert("초대 도중 오류가 발생했습니다.");
    }
  };

  // 현재 사용자의 방장 여부 갱신
  useEffect(() => {
    const me = users.find((u) => u.userName === userName);
    setCurrentIsHost(me ? me.isHost : false);
  }, [users, userName]);

  // 디버깅
  useEffect(() => {
    console.log('Updated users:', users);
    users.forEach((user) =>
      console.log(`User ${user.userName}: isHost = ${user.isHost}, ready = ${user.ready}`)
    );
  }, [users]);

  // ready / start 관련 상태 계산
  const myReady = users.find((u) => u.userName === userName)?.ready;
  const nonHostUsers = currentIsHost
    ? users.filter((u) => u.userName !== userName)
    : users.filter((u) => !u.isHost);
  const allNonHostReady = nonHostUsers.length === 0 || nonHostUsers.every((u) => u.ready);

  // 게임 종료 후 대기 화면으로 복귀 시 호출될 콜백
  const handleResultConfirmed = () => {
    setScreen('chat');
    const client = getStompClient();
    if (client && client.connected) {
      client.publish({
        destination: '/app/chat.clearReady',
        body: JSON.stringify({ roomId, sender: userName }),
      });
      console.log('Clear ready status message sent');
    } else {
      console.error('STOMP client is not connected yet.');
    }
  };

  const handleNewMessage = (sender: string, message: string) => {
    console.log(`🐟 [DEBUG] New Message from "${sender}": "${message}"`);
    
    setFishMessages((prev) => ({
      ...prev,
      [sender]: message, // 🛑 상태가 업데이트되지만, Fish.tsx에서 즉시 반영되는지 확인 필요
    }));
  
    setTimeout(() => {
      console.log(`💨 [DEBUG] Message cleared for ${sender}`);
      setFishMessages((prev) => ({
        ...prev,
        [sender]: "", // 💨 메시지를 삭제 (하지만 상태 반영이 예상과 다르게 동작할 수도 있음)
      }));
    }, 3000);
  };
  


  return (
    <>
      {!isConnected ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 opacity-10">
          <p className="text-2xl font-bold text-gray-900">로딩중...</p>
        </div>
      ) : (
        <>
          {screen === 'chat' && (
            <div className="relative w-full h-full min-h-screen flex items-center justify-center bg-gray-100"
              style={{ backgroundImage: "url('/chat_images/background.png')", backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}>
  
              {/* 물고기 렌더링, 말풍선표시 */}
              {fishes.map((fish) => (
                <Fish key={fish.fishId} fish={fish} message={fishMessages[fish.fishName] || ''}/>
                ))}
                

  
              <div className="absolute inset-0 bg-white opacity-20"></div>
  
              {/* 참가자 리스트 (왼쪽 배치) */}
              <div className="absolute top-24 left-8 w-[250px]">
                <ParticipantList 
                  users={displayUsers} 
                  currentUser={userName} 
                  currentIsHost={currentIsHost} 
                  onKickUser={(target) => {
                    const client = getStompClient();
                    if (client && client.connected) {
                      client.publish({
                        destination: '/app/chat.kickUser',
                        body: JSON.stringify({ roomId, targetUser: target, sender: userName }),
                      });
                    }
                  }} 
                />
              </div>
  
              {/* 오른쪽 패널 (친구 초대, 나가기 버튼, 채팅창, Ready/Start 버튼) */}
              <div className="absolute top-24 right-16 flex space-x-4">
  
                {/* 친구 목록 리스트 (초대 버튼을 눌렀을 때만 보임) */}
                {showFriendList && (
                  <div className="w-[300px] bg-white/70 shadow-md p-4 rounded-lg">  {/* 크기 조정 */}
                    <div className="flex justify-end mb-2">
                      <button onClick={() => setShowFriendList(false)} className="text-gray-500 hover:text-black">❌</button>
                    </div>
                    <FriendList 
                      userName={userName} 
                      roomId={roomId} 
                      isHost={currentIsHost} 
                      participantCount={users.length} 
                      onInvite={(friendId) => {
                        if (users.length >= 6) {
                          alert('참가자가 최대 인원(6명)을 초과할 수 없습니다.');
                          return;
                        }
                        inviteFriend(friendId);
                      }} 
                    />
                    
                    {/* 친구 검색 기능 (방장만 보이게 처리) */}
                    {currentIsHost && (
                      <div className="mt-3 flex items-center space-x-2">
                        <input 
                          type="text" 
                          placeholder="아이디를 입력하세요." 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <button className="mt-2 w-16 px-3 py-2 bg-blue-600 text-sm text-white rounded hover:bg-blue-700 transition">
                          검색
                        </button>
                      </div>
                    )}
                  </div>
                )}
  
                {/* 오른쪽 기능 패널 (버튼, 채팅창, Ready/Start 버튼 포함) */}
                <div className="flex flex-col space-y-4 w-[300px] items-center">  {/* 패널 크기 통일 */}

                  {/* 친구 초대 & 나가기 버튼 */}
                  <div className="flex space-x-2 w-full">  {/* 너비 맞추기 */}
                    <button 
                      onClick={() => setShowFriendList((prev) => !prev)} 
                      className="w-1/2 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-center"
                    >
                      친구 초대
                    </button>
                    <button 
                      onClick={() => {
                        const client = getStompClient();
                        if (client && client.connected) {
                          client.publish({
                            destination: '/app/chat.leaveRoom',
                            body: JSON.stringify({ roomId, sender: userName }),
                          });
                          router.replace('/main');
                        }
                      }} 
                      className="w-1/2 px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-center"
                    >
                      나가기
                    </button>
                  </div>

                  {/* ✅ 채팅창 크기 통일 & send 버튼 내부 정렬 유지 */}
                  <div className="p-3 bg-white/70 rounded shadow-md w-full">
                    <ChatBox roomId={roomId} userName={userName} onNewMessage={handleNewMessage} />
                  </div>

                  {/* Ready / Start 버튼 */}
                  <div className="w-full">
                    {currentIsHost ? (
                      <button 
                        onClick={() => {
                          if (!allNonHostReady) return;
                          const client = getStompClient();
                          if (client && client.connected) {
                            client.publish({
                              destination: '/app/game.start',
                              body: JSON.stringify({ roomId }),
                            });
                          }
                        }} 
                        className={`w-full px-6 py-3 bg-yellow-300 text-white text-xl rounded ${allNonHostReady ? '' : 'opacity-50 cursor-not-allowed'}`} 
                        disabled={!allNonHostReady}
                      >
                        Start Game
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          const client = getStompClient();
                          if (client && client.connected) {
                            if (myReady) {
                              client.publish({
                                destination: '/app/chat.unready',
                                body: JSON.stringify({ roomId, sender: userName }),
                              });
                            } else {
                              client.publish({
                                destination: '/app/chat.ready',
                                body: JSON.stringify({ roomId, sender: userName }),
                              });
                            }
                          }
                        }} 
                        className="w-full px-6 py-3 bg-yellow-300 text-white text-xl rounded"
                      >
                        {myReady ? 'Unready' : 'Ready'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
  
          {/* 게임 화면 */}
          {screen === 'game' && (
            <div className="w-full h-screen bg-cover bg-center">
              <Game 
                roomId={roomId} 
                userName={userName} 
                initialPlayers={gamePlayers} 
                onResultConfirmed={() => setScreen('chat')} 
                user={user} 
              />
            </div>
          )}
        </>
      )}
    </>
    
  );
}