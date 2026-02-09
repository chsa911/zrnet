import RegistrationForm from "../components/RegistrationForm";
import { useI18n } from "../context/I18nContext";

export default function RegisterPage() {
  const { t } = useI18n();

  return (
    <section className="zr-section">
      <h1>{t("register_title")}</h1>
      <p className="zr-lede">{t("register_lede")}</p>

      <div className="zr-card">
        <RegistrationForm />
      </div>
    </section>
  );
}