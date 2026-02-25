import ExpenseManager from "@/components/ExpenseMaganer";
import FixedCostsManager from "@/components/FixedCostsManager";
import Navigation from "@/components/navigation/Navigation";
import DieselManager from "../dashboard/DieselForm";

export default function Page() {
	return (
		<>
		<Navigation/>
		<div className="p-4">
		<ExpenseManager/>
		<FixedCostsManager/>
		</div>
		</>
	);
}