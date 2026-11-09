import { useTranslation } from "react-i18next";
import { FlasherPage } from "@/features/flasher/FlasherPage";

export function Component() {
  const { t } = useTranslation();
  return (
    <>
      <title>{t("titles.flasher")}</title>
      <FlasherPage />
    </>
  );
}
