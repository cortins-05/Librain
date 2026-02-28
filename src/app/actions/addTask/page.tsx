import { BrainCog } from "lucide-react";
import MainComponentAddTask from '../../../components/AddTask/mainComponent';

export default function AddTaskPage() {
  return (
    <section className="flex-1 p-10 flex flex-col gap-4">
      <h1 className="text-5xl flex gap-3 font-bold"> <BrainCog size={50} className="text-blue-500"/> Add New Task </h1>
      <h2 className="text-2xl font-semibold text-secondary-foreground">Add news tasks and lets the IA to decide to you the priority of them!!</h2>
      <MainComponentAddTask />
    </section>
  );
}