"use client";

import CollectionItemCard from "./CollectionItemCard";

interface CustomCollectionTapProps {
  customFishList: {
    fishTypeId: number;
    fishTypeName: string;
    fishImage: string;
  }[];
}
// 탭 "커스텀" 화면
export default function CustomCollectionTab({ customFishList }: CustomCollectionTapProps) {
  return (
    <div
      className="
        w-full h-screen gap-1 sm:gap-3
        pb-[100px] sm:pb-[120px] md:pb-[120px] lg:pb-[120px]
        sm:pl-1 pr-1
        grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5
        flex flex-wrap items-start justify-start
        overflow-y-scroll max-h-[520px]
        scrollbar-none
      "
      style={{
        msOverflowStyle: "none", // IE, Edge에서 스크롤바 숨기기
        scrollbarWidth: "none", // Firefox에서 스크롤바 숨기기
      }}
    >
      {customFishList.map((fish) => (
        <CollectionItemCard key={fish.fishTypeId} imageSrc={fish.fishImage} name={fish.fishTypeName} />
      ))}
    </div>
  );
}
