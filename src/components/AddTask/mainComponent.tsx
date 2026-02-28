"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react";
import { Input } from "../ui/input";
import { Textarea } from "@/components/ui/textarea"
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function MainComponentAddTask() {
    const router = useRouter();

    const [loading, setLoading] = useState<boolean>(false);
    
    async function saveTask() {
        if (!resource || !value1 || !description) return
        setLoading(true)

        try {
            const res = await fetch("/api/task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resource,
                value: value1,
                description,
            }),
            })

            if (!res.ok) {
            const { error } = await res.json()
            console.error("Error al guardar:", error)
            return
            }

            const { stored } = await res.json()
            console.log("Guardado con id:", stored._id)
            // Aquí puedes lanzar el job de IA pasándole stored._id
            toast("Guardado con éxito...");
            router.push("/");
        }catch{
            toast("Error al guardar...")
        } finally {
            setLoading(false)
        }
    }

    const [resource, setResource] = useState<string|null>(null);

    const [value1, setValue1] = useState<string|null>(null);

    const [description, setDescription] = useState<string|null>(null);

  return (
    <>
        <span className="flex gap-3 items-center mt-3">
            <span><span className="text-xl font-bold">1.</span> First, select a resource: </span>
            <Select onValueChange={(e)=>setResource(e)}>
                <SelectTrigger>
                <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                <SelectGroup>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                </SelectGroup>
                </SelectContent>
            </Select>
        </span>
        {
            resource
            &&
            <div className="mt-4 flex flex-col gap-2.5">
                <span className="flex gap-3 items-end"><span className="text-xl font-bold">2.</span>Then, set your resource:</span>
                {
                    resource == "url"
                    &&
                    <Input
                        placeholder="Url..."
                        onChange={(e)=>setValue1(e.target.value)}
                        value={value1 ?? ""}
                        type="text"
                    />
                }
                {
                    resource == "text"
                    &&
                    <Textarea 
                        onChange={(e)=>setValue1(e.target.value)}
                    />
                }
                {
                    resource == "file"
                    &&
                    <Input 
                        type="file"
                        onChange={(e)=>setValue1(e.target.value)}
                    />
                }
            </div>
        }
        {
            value1
            &&
            <div className="mt-3 flex flex-col gap-3">
                <span className="flex gap-3 items-end"><span className="text-xl font-bold">3.</span>Finally, add a short description:</span>
                <Textarea 
                    onChange={(e)=>setDescription(e.target.value)}
                />
            </div>
        }
        {
            value1 && description && resource
            &&
            <Button onClick={saveTask} className="w-fit ml-auto" size={"lg"}>
                {
                    loading
                    ?
                    <Spinner className="h-full w-auto" />
                    :
                    "Guardar"
                }
            </Button>
        }
    </>
  );
}