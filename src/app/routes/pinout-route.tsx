import { useSearchParams } from "react-router";
import { BoardSignalsProvider } from "@/features/board/board-signals";
import { PinoutExplorer } from "@/features/board/PinoutExplorer";

export function Component() {
  const [params] = useSearchParams();
  const lessonId = params.get("lesson");
  const variant = params.get("variant");
  const initialPin = params.get("pin");
  return (
    <BoardSignalsProvider>
      <PinoutExplorer key={`${lessonId}:${variant}:${initialPin}`} lessonId={lessonId} variant={variant} initialPin={initialPin} />
    </BoardSignalsProvider>
  );
}
