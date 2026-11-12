import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { lessonMaterials, MATERIAL_PRODUCTS } from "@/content/materials";
import { Icon } from "@/ui/Icon";
import styles from "./LessonMaterials.module.css";

/** Product suggestions beside the bench instructions, with support limits beside the link. */
export function LessonMaterials({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation("lesson");
  const suggestions = lessonMaterials(lessonId);

  return (
    <div className={styles.root}>
      <p className={styles.intro}>{t("materials.intro")}</p>
      <ul className={styles.list}>
        {suggestions.map(({ product: id, role }) => {
          const product = MATERIAL_PRODUCTS[id];
          return (
            <li key={id} className={styles.item} data-role={role}>
              <span className={styles.role}>{t(`materials.role.${role}`)}</span>
              <h4>{t(`materials.products.${id}.name`)}</h4>
              <p>{t(`materials.products.${id}.why`)}</p>
              <div className={styles.links}>
                <a href={product.url} target="_blank" rel="noopener noreferrer">
                  {t(`materials.action.${product.link}`)}
                  <span className="visually-hidden">{t("materials.newTab")}</span>
                  <Icon name="external" size={15} />
                </a>
                {"docsUrl" in product ? (
                  <a href={product.docsUrl} target="_blank" rel="noopener noreferrer">
                    {t("materials.action.docs")}
                    <span className="visually-hidden">{t("materials.newTab")}</span>
                    <Icon name="external" size={15} />
                  </a>
                ) : null}
                {"editorUrl" in product ? (
                  <Link to={product.editorUrl}>{t("materials.action.openExample")}</Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
