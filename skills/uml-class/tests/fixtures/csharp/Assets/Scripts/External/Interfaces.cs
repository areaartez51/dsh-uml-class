using System;
using UnityEngine;

namespace Colonization.Unit.External
{
    public interface IMover
    {
        void StartMove(Vector3 target, Action executed);
    }

    public interface IUnitMiner
    {
        void TryStartMine(ICrystal crystal, IUnitStorage unitStorage, Action executed);
    }

    public interface IUnitStorage
    {
        void ReceiveOrePiece(ResourceConfig resourceConfig);
        int GiveOre();
    }

    public interface IPoolable
    {
        event Action<IPoolable> Destroyer;
        void ReturnToPool();
    }

    public interface ICrystal : IPoolable
    {
        Vector3 Position { get; }
    }

    public interface ITaskDistributor
    {
        void AddListener(ITaskReceiver listener);
    }
}
